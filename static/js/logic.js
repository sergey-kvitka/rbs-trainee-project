const backendDomain = 'http://localhost:9000';

const fileContainerId = 'vfs-explorer-container';
const filpathPId = 'vfs-current-filepath-p';
const loadingInfoId = 'loading-info';

const defaultRoot = '/home';

function main() {  // * данный код будет запущен при загрузке JS-файла
    // вызов метода для отправки запроса на получение информации о
    // текущей директории; в качестве параметров переданы путь по умолчанию
    // и обработчики при успешном и неудачном выполнении запроса
    rootInfo(defaultRoot, renderNewRoot, handleResponseError);
}

// renderNewRoot запускает методы для отрисовки списка файлов и информации 
// о текущей директории, а также скрывает элемент с информацией о загрузке данных
function renderNewRoot(files, path) {
    // запуск рендеринга и обновление отображаемого пути
    renderFiles(files, path);
    updateCurrentPath(path);
    hideLoading(); // * скрытие информации о загрузке
}

// handleResponseError выводит сообщение об ошибке в окно alert
// и скрывает элемент с информацией о загрузке данных
function handleResponseError(message) {
    hideLoading(); // * скрытие информации о загрузке
    alert(`Ошибка выполнения запроса\nТекст ошибки: "${message}"`);
}

// rootInfo отправляет запрос для получения информации о внутренней структуре директории.
// При успешном получении ответа запускает рендеринг вложенных файлов и обновление отображаемого пути 
function rootInfo(root, successCallback, errorCallback) {
    // настройка AJAX-запроса (URL, параметр, тип данных ответа (JSON))
    const url = new URL(`${backendDomain}/vfs`);
    url.searchParams.set('root', root);
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json'; // ответ будет парситься в JSON автоматически
    // GET-запрос будет отправлен на указанный URL в асинхронном режиме (true)
    xhr.open('GET', url, true);

    // обработка выполненного запроса
    xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState == 4) { // * readyState == 4 означает, что запрос выполнен
            if (xhr.status == 200) {
                // обработка успешного запроса
                const { path: path, files: files } = xhr.response;
                successCallback(files, path);
            }
            else {
                // обработка запроса, вызвавшего ошибку
                errorCallback(xhr.response.message);
            }
        }
    });
    // отображения сообщения о загрузке данных
    showLoading();
    // * отправка GET-запроса
    xhr.send();
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
            rootInfo(fileInfo.path, renderNewRoot, handleResponseError);
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
    files = [...fileInfoArr];
    // сортировка массива по свойству объектов name
    files.sort((a, b) => {
        const aName = a.name; const bName = b.name;
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
    const elements = files.map(fileInfo => createFileElement(fileInfo));
    // получение элемента-контейнера файлов и его очистка
    const fileContainer = document.getElementById(fileContainerId);
    fileContainer.textContent = '';
    // добавление созданных HTML-элементов в полученный контейнер
    elements.forEach(element => {
        fileContainer.appendChild(element);
    });
}

// updateCurrentPath устанавливает в содержимое элемента с текущим путём новое значение
function updateCurrentPath(path) {
    const pathElement = document.getElementById(filpathPId);
    pathElement.innerText = path;
}

// getParentDir возвращает путь 'parent' директории на основе переданного пути.
// В случае, если передана корневая директория, вернётся то же значение
function getParentDir(path) {
    let nodes = path.split('/');
    nodes.pop();
    return nodes.length > 1 ? nodes.join('/') : '/';
}

// hideLoading скрывает элемент с информацией о загрузке данных
function hideLoading() {
    const loadingInfo = document.getElementById(loadingInfoId);
    loadingInfo.classList.add('display-none');
}
// showLoading показывает элемент с информацией о загрузке данных
function showLoading() {
    const loadingInfo = document.getElementById(loadingInfoId);
    loadingInfo.classList.remove('display-none');
}

main(); // * запуск main