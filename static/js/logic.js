const BACKEND_DOMAIN = 'http://localhost:9000';

const FILE_CONTAINER_ID = 'vfs-explorer-container';
const FILEPATH_P_ID = 'vfs-current-filepath';

function main() {
    //rootInfo('~/');
}

function rootInfo(root) {
    let url = new URL(`${BACKEND_DOMAIN}/vfs`);
    url.searchParams.set('root', root);
    let xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.open('GET', url, true);
    xhr.send();

    xhr.onload = () => {
        if (xhr.status % 100 == 2) {
            return // TODO  
            renderFiles(xhr.response.files);
            updateCurrentPath(xhr.response.path);
        }
        else alert(`Ошибка выполнения запроса\nТекст ошибки: "${xhr.response.message}"`);
    }
    xhr.onerror = () => alert(`Ошибка выполнения запроса`);
}

function createFileElement(fileInfo, isParentDir) {
    let fileElement = document.createElement('div');
    fileElement.classList.add('file-elem');
    fileElement.addEventListener('click', e => {
       rootInfo(fileInfo.path); 
    });
    
    let fileIcon = document.createElement('img');
    fileIcon.src = `../icons/${isParentDir ? 'back' : (fileInfo.isDir ? 'dir' : 'file')}.png`;
    fileElement.appendChild(fileIcon);

    let name = document.createElement('p');
    name.innerText = fileInfo.name;
    if (isParentDir) name.classList.add('bold');
    fileElement.appendChild(name);

    if (!fileInfo.havePermission) {
        let lockIcon = document.createElement('img');
        lockIcon.src = `../icons/lock.png`;
        fileElement.appendChild(lockIcon);
    }

    return fileElement;
}

function renderFiles(fileInfoArr) {
    fileInfoArr = fileInfoArr.sort((a, b) => {
        let aName = a.name; let bName = b.name;
        return aName > bName ? 1 : aName < bName ? -1 : 0;
    });
    let fileContainer = document.getElementById(FILE_CONTAINER_ID);
    fileInfoArr.forEach(fileInfo => {
        let fileElement = createFileElement(fileInfo);
        fileContainer.appendChild(fileElement);
    });
}

function updateCurrentPath(path) {
    let pathElement = document.getElementById(FILEPATH_P_ID);
    pathElement.innerText = path;
}

main();