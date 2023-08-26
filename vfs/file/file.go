package file

import (
	"fmt"
	"os"
	"os/user"
	"path/filepath"
	"strings"
	"sync"
	"time"
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

// FileInfo представляет из себя DTO с основной информацией о файле.
// В отличие от File, не содержит в себе вложенную структуру файлов
type FileInfo struct {
	Name           string `json:"name"`
	IsDir          bool   `json:"isDir"`
	FullSize       int64  `json:"fullSize"`
	Path           string `json:"path"`
	HavePermission bool   `json:"havePermission"`
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
		if file.Path == "/proc" {
			continue
		}
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

// getRootInfo возвращает информацию о файлах и директориях, расположенных внутри директории
// root. Также возвращает время работы функции и абсолютный путь на основе указанного root
func GetRootInfo(root string) ([]FileInfo, time.Duration, string, int64, error) {
	start := time.Now() // засечение времени
	user, _ := user.Current()
	root = preprocessPath(root, user.Name)

	// проверка на директорию
	destinationExists, err := catalogExists(root)
	if !destinationExists {
		if err != nil {
			return nil, *new(time.Duration), "", 0, err
		}
		return nil, *new(time.Duration), "", 0, fmt.Errorf("каталог \"%s\" не найден", root)
	}
	// конвертация пути в абсолютный
	root, err = filepath.Abs(root)
	if err != nil {
		return nil, *new(time.Duration), "", 0, err
	}

	// сохранение иерархии файлов в один объект со вложенными объектами
	rootFile, err := NewFile(root)
	if err != nil {
		return nil, *new(time.Duration), "", 0, err
	}

	// получение количества вложенных файлов и проверка на то, есть ли доступ к данному файлу
	length := len(rootFile.InnerFiles)
	if rootFile.NoPermission || length == 0 {
		return make([]FileInfo, 0), *new(time.Duration), root, 0, nil
	}

	// создание WaitGroup с изначальным значением
	// счётчика, равным количеству вложенных файлов
	var wg sync.WaitGroup
	wg.Add(length)

	// создание структуры со срезом для сохранения информации
	// о вложенных файлах с мьютексом для потокобезопасности
	type InfoStorage struct {
		sync.RWMutex
		s []FileInfo
	}
	infoStorage := InfoStorage{s: make([]FileInfo, 0, length)}

	for _, file := range rootFile.InnerFiles {
		// создание горутины для каждого вложенного файла
		go func(file File, infoStorage *InfoStorage, wg *sync.WaitGroup) {
			defer wg.Done()
			// создание DTO с информацией о файле
			fileInfo := FileInfo{
				Name:           file.Name,
				IsDir:          file.IsDir,
				FullSize:       file.FullSize(),
				Path:           file.Path,
				HavePermission: !file.NoPermission,
			}
			// потокобезопасная запись значения в срез
			infoStorage.Lock()
			infoStorage.s = append(infoStorage.s, fileInfo)
			infoStorage.Unlock()
		}(file, &infoStorage, &wg)
	}
	// ожидание завершения горутин
	wg.Wait()

	// копирование записанных данных
	infoStorage.RLock()
	fileInfoSlice := infoStorage.s[:]
	infoStorage.RUnlock()

	var totalSize int64 = 0
	for _, fileInfo := range fileInfoSlice {
		totalSize += fileInfo.FullSize
	}
	elapsed := time.Since(start) // засечение времени
	return fileInfoSlice, elapsed, root, totalSize, nil
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
