package main

import (
	"flag"
	"fmt"
	"os"
	"os/user"
	"path/filepath"
	vfile "stager/go/src/vfs/file"
	"strings"
	"sync"
	"time"
)

func main() { // ! точка входа

	start := time.Now() // засечение времени
	fmt.Printf("\nПрограмма запущена\n\n")

	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("\nПри работе программы произошла ошибка. Текст ошибки: `%s`\n\n", r)
		}
	}()

	// считывание флагов при запуске программы
	rootPtr := flag.String("root", "/", "root directory to scan")
	flag.Parse()

	// получение текущего имени пользователя
	user, _ := user.Current()
	username := user.Name

	root := preprocessPath(*rootPtr, username)

	// проверка на директорию
	destinationExists, err := catalogExists(root)
	if !destinationExists {
		if err != nil {
			panic(err)
		}
		panic(fmt.Errorf("каталог \"%s\" не найден", root))
	}
	// конвертация пути в абсолютный
	root, err = filepath.Abs(root)
	if err != nil {
		panic(err)
	}

	// сохранение иерархии файлов в один объект со вложенными объектами
	rootFile, err := vfile.NewFile(root)
	if err != nil {
		panic(err)
	}

	fmt.Printf("Просмотр директории \"%s\":\n\n", root)

	if rootFile.NoPermission {
		fmt.Println("Невозможно просмотреть содержимое данного каталога: доступ запрещён!")
	}

	var wg sync.WaitGroup
	wg.Add(len(rootFile.InnerFiles))

	// вывод результата сканирования директории
	for _, file := range rootFile.InnerFiles {
		go func(file vfile.File) {
			defer wg.Done()
			fileType := "_F"
			size := file.FullSize()
			if file.IsDir {
				fileType = "D_"
			}
			permission := ""
			if file.NoPermission {
				permission = " (permission denied)"
			}
			fileSize, sizeUnit := vfile.FormatSize(size)
			fmt.Printf("%s - %s  %.2f %s%s\n", fileType, file.Name, fileSize, sizeUnit, permission)
		}(file)
	}

	wg.Wait()

	elapsed := time.Since(start) // засечение времени
	fmt.Printf("\nПрограмма завершена. Время выполнения: %s\n\n", elapsed)
}

// preprocessPath обрабатывает путь path таким образом, что символ ~
// заменяется на конструкцию /home/<username>, и к строке в начале
// добавляются символы ' ./ ', если первым её символом не является ' / '
func preprocessPath(path string, username string) string {
	newPath := path
	if strings.HasPrefix(newPath, "~") {
		newPath = strings.Replace(newPath, "~", fmt.Sprintf("/home/%s", username), 1)
	}
	if !strings.HasPrefix(newPath, "/") {
		newPath = fmt.Sprintf("./%s", newPath)
	}
	return newPath
}

// catalogExists проверяет существование директории по указанному пути
func catalogExists(path string) (bool, error) {
	info, err := os.Stat(path)
	if err != nil {
		return false, nil
	}
	if !info.IsDir() {
		return false, fmt.Errorf("по указанному пути расположен файл, а не директория (\"%s\")", path)
	}
	return true, nil
}
