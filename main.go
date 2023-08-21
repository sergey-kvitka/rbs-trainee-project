package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	vfile "rbs-trainee-project/vfs/file"
)

const port int = 9000

func main() {
	// обработчик для получения статических элементов
	http.Handle("/", http.FileServer(http.Dir("/static/")))

	// обработчик для получения информации о внутренней структуре директории
	http.HandleFunc("/vfs", getRootInfo)

	fmt.Println("HTTP сервер запущен")
	http.ListenAndServe(fmt.Sprintf(":%d", port), nil)
}

// getRootInfo является функцией обработки запроса для получения информации о внутренней
// структуре директории. Путь к директории задаётся через URL-параметр root
func getRootInfo(w http.ResponseWriter, r *http.Request) {
	// получение значение параметра root. Значение по умолчанию - домашняя директория
	root := "~/"
	keys, ok := r.URL.Query()["root"]
	if ok {
		root = keys[0]
	}
	// получение информации о внутренней структуре директории
	fileInfoSlice, elapsed, path, _ := vfile.GetRootInfo(root)

	// описание структуры объекта, который будет возвращён методом в формате JSON
	type result struct {
		Files   []vfile.FileInfo `json:"files"`
		Elapsed int64            `json:"elapsed"`
		Path    string           `json:"path"`
	}
	// задание значения заголовку для понимания того, что формат возвращаемого значения - JSON
	w.Header().Set("Content-Type", "application/json")
	// сериализация объекта с полученными данными в JSON и запись результата в response
	jsonResponse, _ := json.Marshal(result{Files: fileInfoSlice, Elapsed: elapsed.Microseconds(), Path: path})
	w.Write(jsonResponse)
}
