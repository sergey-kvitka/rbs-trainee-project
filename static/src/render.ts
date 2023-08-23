import { FileInfo, fileContainerId, loadingInfoId, getParentDir, filepathPId } from "./main";
import rootInfo from "./rootInfo";
import { handleResponseError } from "./rootInfo";

// hideLoading скрывает элемент с информацией о загрузке данных
export function hideLoading(): void {
    const loadingInfo: HTMLElement | null = document.getElementById(loadingInfoId);
    if (!loadingInfo) return printErrorOnGetByIdFail(loadingInfoId);
    loadingInfo.classList.add('display-none');
}
// showLoading показывает элемент с информацией о загрузке данных
export function showLoading(): void {
    const loadingInfo: HTMLElement | null = document.getElementById(loadingInfoId);
    if (!loadingInfo) return printErrorOnGetByIdFail(loadingInfoId);
    loadingInfo.classList.remove('display-none');
}

// render запускает методы для отрисовки списка файлов и информации 
// о текущей директории, а также скрывает элемент с информацией о загрузке данных
export default function render(files: Array<FileInfo>, path: string): void {
    // запуск рендеринга и обновление отображаемого пути
    renderFiles(files, path);
    updateCurrentPath(path);
    hideLoading(); // * скрытие информации о загрузке
}

// updateCurrentPath устанавливает в содержимое элемента с текущим путём новое значение
function updateCurrentPath(path: string): void {
    const pathElement: HTMLElement | null = document.getElementById(filepathPId);
    if (!pathElement) return printErrorOnGetByIdFail(filepathPId);
    pathElement.innerText = path;
}

// printErrorOnGetByIdFail печатает в консоль информацию об ошибке, 
// связанной с неудачной попыткой нахождения элемента с заданным id
function printErrorOnGetByIdFail(id: string): void {
    console.error(`Ошибка получения элемента с ID = ${id}: элемент не найден`);
}

// createFileElement создаёт HTML-элемент для отображаемого файла на основе информации о нём
function createFileElement(fileInfo: FileInfo): HTMLElement {
    // создание контейнера для отдельного файла
    const fileElement: HTMLElement = document.createElement('div');
    fileElement.classList.add('file-elem');
    // обработчик нажатия для отправки нового запроса будет установлен в случае, если
    // данный файл является директорией, на открытие которой есть права доступа
    if (fileInfo.isDir && fileInfo.havePermission) {
        fileElement.addEventListener('click', (): void => {
            rootInfo(fileInfo.path, render, handleResponseError);
        });
    }

    // создание иконки файла (файл/директория/переход в директорию на уровень выше)
    const fileIcon: HTMLImageElement = document.createElement('img');
    fileIcon.src = `../icons/${fileInfo.isParentDir ? 'back' : (fileInfo.isDir ? 'dir' : 'file')}.png`;
    fileElement.appendChild(fileIcon);

    // создание элемента с названием файла
    const name: HTMLElement = document.createElement('p');
    name.innerText = fileInfo.name;
    if (fileInfo.isParentDir) name.classList.add('bold');
    fileElement.appendChild(name);

    // в случае, если к файлу нет доступа, будет добавлена иконка замка
    if (!fileInfo.havePermission) {
        const lockIcon: HTMLImageElement = document.createElement('img');
        lockIcon.src = `../icons/lock.png`;
        fileElement.appendChild(lockIcon);
    }

    return fileElement;
}

// renderFiles принимает массив с объектами с информацией о файлах и
// отрисовывает соответствующие им HTML-элементы
function renderFiles(fileInfoArr: Array<FileInfo>, path: string): void {
    // получение элемента-контейнера файлов и его очистка
    const fileContainer: HTMLElement | null = document.getElementById(fileContainerId);
    if (!fileContainer) return printErrorOnGetByIdFail(fileContainerId);

    let files: Array<FileInfo> = [...fileInfoArr];
    // сортировка массива по свойству объектов name
    files.sort((a: FileInfo, b: FileInfo): number => {
        const aName: string = a.name;
        const bName: string = b.name;
        return aName > bName ? 1 : aName < bName ? -1 : 0;
    });
    // вставка дополнительного элемента в начало массива; данный 
    // элемент будет отвечать за переход в директорию на уровень выше
    if (path != '/') {
        files = [({
            name: '../',
            // если текущий путь - корневая директория, то в качестве
            // свойства path у данного объекта будет null    
            path: getParentDir(path),
            havePermission: true,
            isDir: true,
            // свойство для отличия данного объекта от остальных
            isParentDir: true
        }), ...files];
    }
    // через метод map элементы массива конвертируются в HTML-элементы
    const elements: Array<HTMLElement> = files.map(
        (fileInfo: FileInfo): HTMLElement => createFileElement(fileInfo)
    );
    // очистка контейнера от старых элементов
    fileContainer.textContent = '';
    // добавление созданных HTML-элементов в полученный контейнер
    elements.forEach((element: HTMLElement): void => {
        fileContainer.appendChild(element);
    });
}
