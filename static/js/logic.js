const BACKEND_DOMAIN = 'http://localhost:9000';

const FILE_CONTAINER_ID = 'vfs-explorer-container';
const FILEPATH_P_ID = 'vfs-current-filepath-p';
const LOADING_INFO_ID = 'loading-info';

const DEFAULT_ROOT = '~/';

function main() {  // * данный код будет запущен при загрузке JS-файла
    rootInfo(DEFAULT_ROOT);
}

// rootInfo отправляет запрос для получения информации о внутренней структуре директории.
// При успешном получении ответа запускает рендеринг вложенных файлов и обновление отображаемого пути 
function rootInfo(root) {
    // настройка AJAX-запроса (URL, параметр, тип данных ответа (JSON))
    const url = new URL(`${BACKEND_DOMAIN}/vfs`);
    url.searchParams.set('root', root);
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    // отправка GET-запроса на указанный URL в асинхронном режиме (true)
    xhr.open('GET', url, true);
    xhr.send();
    // отображения сообщения о загрузке данных
    showLoading(true);

    // обработка успешного запроса
    xhr.onload = () => {
        // скрытие информации о загрузке
        showLoading(false);
        // проверка HTTP-статуса (200-299 - запрос выполнен успешно)
        if (xhr.status >= 200 && xhr.status < 300) {
            const path = xhr.response.path;
            // запуск рендеринга и обновление отображаемого пути
            renderFiles(xhr.response.files, path);
            updateCurrentPath(path);
        }
        else alert(`Ошибка выполнения запроса\nТекст ошибки: "${xhr.response.message}"`);
    }
    // обработка запроса, вызвавшего ошибку
    xhr.onerror = () => {
        // скрытие информации о загрузке
        showLoading(false);
        alert(`Ошибка выполнения запроса`);
    }
}

// createFileElement создаёт HTML-элемент для отображаемого файла на основе информации о нём
function createFileElement(fileInfo) {
    // создание контейнера для отдельного файла
    const fileElement = document.createElement('div');
    fileElement.classList.add('file-elem');
    // обработчик нажатия для отправки нового запроса будет установлен в случае, если
    // данный файл является директорией, на открытие которой есть права доступа, а также
    // если свойство fileInfo path не является null (так предотвращается попытка
    // перехода в 'parent' директорию при нахождении в корневой директории)
    if (fileInfo.isDir && fileInfo.havePermission && fileInfo.path) {
        fileElement.addEventListener('click', () => {
            rootInfo(fileInfo.path);
        });
    }

    // создание иконки файла (файл/директория/переход в директорию на уровень выше)
    const fileIcon = document.createElement('img');
    fileIcon.src = `../icons/${fileInfo.isParentDir ? 'back' : (fileInfo.isDir ? 'dir' : 'file')}.png`;
    fileElement.appendChild(fileIcon);

    // создание элемента с названием файла
    const name = document.createElement('p');
    name.innerText = fileInfo.name;
    if (fileInfo.isParentDir) name.classList.add('bold');
    fileElement.appendChild(name);

    // в случае, если к файлу нет доступа, будет добавлена иконка замка
    if (!fileInfo.havePermission) {
        const lockIcon = document.createElement('img');
        lockIcon.src = `../icons/lock.png`;
        fileElement.appendChild(lockIcon);
    }

    return fileElement;
}

// renderFiles принимает массив с объектами с информацией о файлах и
// отрисовывает соответствующие им HTML-элементы
function renderFiles(fileInfoArr, path) {
    files = fileInfoArr.slice();
    // сортировка массива по свойству объектов name
    files.sort((a, b) => {
        const aName = a.name; const bName = b.name;
        return aName > bName ? 1 : aName < bName ? -1 : 0;
    });
    // вставка дополнительного элемента в начало массива; данный 
    // элемент будет отвечать за переход в директорию на уровень выше
    if (path != '/') files.unshift({
        name: '../',
        // если текущий путь - корневая директория, то в качестве
        // свойства path у данного объекта будет null    
        path: getParentDir(path),
        havePermission: true,
        isDir: true,
        // свойство для отличия данного объекта от остальных
        isParentDir: true
    });
    // через метод map элементы массива конвертируются в HTML-элементы
    const elements = files.map(fileInfo => createFileElement(fileInfo));
    // получение элемента-контейнера файлов и его очистка
    const fileContainer = document.getElementById(FILE_CONTAINER_ID);
    fileContainer.textContent = '';
    // добавление созданных HTML-элементов в полученный контейнер
    for (const element of elements) {
        fileContainer.appendChild(element);
    }
}

// updateCurrentPath устанавливает в содержимое элемента с текущим путём новое значение
function updateCurrentPath(path) {
    const pathElement = document.getElementById(FILEPATH_P_ID);
    pathElement.innerText = path;
}

// getParentDir возвращает путь 'parent' директории на основе переданного пути.
// В случае, если передана корневая директория, вернётся то же значение
function getParentDir(path) {
    let nodes = path.split('/');
    nodes.pop();
    return nodes.length > 1 ? nodes.join('/') : '/';
}

// showLoading, в рависимости от переданного boolean значения,
// скрывает или показывает элемент с информацией о загрузке данных
function showLoading(show) {
    const loadingInfo = document.getElementById(LOADING_INFO_ID);
    if (show) loadingInfo.classList.remove('display-none');
    else loadingInfo.classList.add('display-none');
}

main(); // * запуск main