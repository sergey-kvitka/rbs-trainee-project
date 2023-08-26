package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	vfile "rbs-trainee-project/vfs/file"
	"time"
)

const port int = 9000
const defaultRoot = "/home"

const saveStatEndpoint = "http://192.168.81.41/saveStatHttpPutHandler.php"

func main() {
	// обработчик для получения статических элементов
	http.Handle("/", http.FileServer(http.Dir("./static/dist")))

	// обработчик для получения информации о внутренней структуре директории
	http.HandleFunc("/vfs", getRootInfo)

	fmt.Println("HTTP сервер запущен")
	http.ListenAndServe(fmt.Sprintf(":%d", port), nil)
}

// getRootInfo является функцией обработки запроса для получения информации о внутренней
// структуре директории. Путь к директории задаётся через URL-параметр root
func getRootInfo(w http.ResponseWriter, r *http.Request) {
	// получение значение параметра root. Если параметр не был получен, значение root останется по умолчанию
	root := defaultRoot
	keys, ok := r.URL.Query()["root"]
	if ok {
		root = keys[0]
	}

	// задание значения заголовку для понимания того, что формат возвращаемого значения - JSON
	w.Header().Set("Content-Type", "application/json")
	// получение информации о внутренней структуре директории
	fileInfoSlice, elapsed, path, totalSize, err := vfile.GetRootInfo(root)
	if err != nil {
		jsonResponse, _ := json.Marshal(map[string]string{"message": err.Error()})
		http.Error(w, string(jsonResponse), 400)
		return
	}

	// описание структуры объекта, который будет возвращён методом в формате JSON
	type result struct {
		Files   []vfile.FileInfo `json:"files"`
		Elapsed int64            `json:"elapsed"`
		Path    string           `json:"path"`
	}

	date := time.Now()
	textDate := fmt.Sprintf("%d-%d-%d %d:%d:%d",
		date.Year(), date.Month(), date.Day(),
		date.Hour(), date.Minute(), date.Second())
	err = saveStatRequest(statResult{Elapsed: elapsed.Microseconds(), Root: path, Size: totalSize, Date: textDate})
	if err != nil {
		fmt.Printf("Произошла ошибка при отправке данных о сканировании директории \"%s\":\n", path)
		fmt.Println("\t", err.Error())
	}

	// сериализация объекта с полученными данными в JSON и запись результата в response
	jsonResponse, _ := json.Marshal(result{Files: fileInfoSlice, Elapsed: elapsed.Microseconds(), Path: path})
	w.Write(jsonResponse)
}

type statResult struct {
	Elapsed int64  `json:"elapsedTime"`
	Root    string `json:"root"`
	Size    int64  `json:"size"`
	Date    string `json:"date"`
}

func saveStatRequest(stat statResult) error {
	jsonStat, err := json.Marshal(stat)
	if err != nil {
		return err
	}
	request, err := http.NewRequest(http.MethodPut, saveStatEndpoint, bytes.NewBuffer(jsonStat))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != 200 {
		return fmt.Errorf(
			"ошибка сохранения информации о сканировании директории (код ошибки: %d)", response.StatusCode)
	}
	return nil
}
