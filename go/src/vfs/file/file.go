package file

import (
	"fmt"
	"os"
	"strings"
)

// File является виртуальным представлением файлов из файловой системы.
// Содержит поля с основной информацией о файлах и, в том случае, если
// это директория, срез из вложенных в неё файлов (структур такого же типа)
type File struct {
	Name         string
	Path         string
	IsDir        bool
	OwnSize      int64
	NoPermission bool
	InnerFiles   []File
}

// FullSize возвращает размер (в байтах) файла с учётом всех вложенных файлов.
// Если файл не является директорией, метод возвращает значение поля OwnSize
func (f File) FullSize() int64 {
	if !f.IsDir {
		return f.OwnSize
	}
	var total int64 = 0
	// рекурсивный запуск функции для получения суммы размеров всех вложенных элементов
	for _, file := range f.InnerFiles {
		total += file.FullSize()
	}
	return total
}

// NewFile позволяет создать виртуальный файл по указанному на реальный файл пути.
// Если файл является директорией, в поле InnerFiles будут сохранены все вложенные
// файлы вместе со своими вложенными файлами
func NewFile(path string) (*File, error) {
	root := new(File)
	// получение информации о файле
	fileInfo, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	root.Name = fileInfo.Name()
	root.IsDir = fileInfo.IsDir()
	// если файл не является директорией, в дальнейшем
	// сканировании вложенных файлов нет необходимости
	if !root.IsDir {
		root.OwnSize = fileInfo.Size()
		return root, nil
	}

	// удаление ненужного символа ' / ' с конца строки
	trimPath := path
	if strings.HasSuffix(path, "/") {
		trimPath = path[:(len([]rune(path)) - 1)]
	}
	root.Path = trimPath

	// получение вложенных файлов
	files, err := getInnerFiles(trimPath)
	if err != nil {
		root.NoPermission = true
		return root, nil
	}
	root.InnerFiles = files

	return root, nil
}

// getInnerFiles возвращает срез файлов, находящихся
// внутри директории по указанному пути
func getInnerFiles(path string) ([]File, error) {
	var files []File
	// если путь - корневой каталог, необходимо добавить
	// в начале ' / ' для корректной работы функции
	var slash string
	if path == "" {
		slash = "/"
	}
	// получение вложенных элементов
	entries, err := os.ReadDir(fmt.Sprintf("%s%s", path, slash))
	if err != nil {
		return nil, err
	}
	for _, entry := range entries {
		fileInfo, err := entry.Info()
		if err != nil {
			continue
		}
		// создание экземпляра для сохранения информации о файле
		file := new(File)
		file.Name = entry.Name()
		file.IsDir = entry.IsDir()
		file.Path = fmt.Sprintf("%s%s%s", path, "/", file.Name)
		if file.IsDir {
			// рекурсивно вызываем функцию, если данный файл - директория
			innerFiles, err := getInnerFiles(file.Path)
			if err != nil {
				file.NoPermission = true
			}
			file.InnerFiles = innerFiles
		} else {
			file.OwnSize = fileInfo.Size()
		}
		// сохранение созданного экземпляра в срез
		files = append(files, *file)
	}
	return files, nil
}

// SizeUnits возвращает срез из названий единиц
// измерения размера файлов в порядке возрастания
func SizeUnits() []string {
	return []string{"bytes", "kB", "mB", "gB", "tB"}
}

// formatSize принимает размер файла в байтах и возвращает более короткую и
// понятную версию, состоящую из числа и подходящей единицы измерения
// (пример: 3584 -> 3.5 bytes)
func FormatSize(size int64) (float64, string) {
	currentSize := float64(size)
	var currentUnit string
	for _, unit := range SizeUnits() {
		currentUnit = unit
		if currentSize < 1024 {
			break
		}
		currentSize /= 1024
	}
	return currentSize, currentUnit
}
