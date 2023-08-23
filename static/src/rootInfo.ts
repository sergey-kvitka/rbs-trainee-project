import { domain, FileInfo } from "./main";
import { showLoading, hideLoading } from "./render";

// handleResponseError выводит сообщение об ошибке в окно alert
// и скрывает элемент с информацией о загрузке данных
export function handleResponseError(message: string): void {
    hideLoading(); // * скрытие информации о загрузке
    alert(`Ошибка выполнения запроса\nТекст ошибки: "${message}"`);
}

// rootInfo отправляет запрос для получения информации о внутренней структуре директории.
// Принимает путь к директории и функции для обработки успешного и неудачного выполнения запроса
export default function rootInfo(
    root: string | null,
    successCallback: (files: Array<FileInfo>, path: string) => void,
    errorCallback: (message: string) => void
): void {
    // настройка AJAX-запроса (URL, параметр, тип данных ответа (JSON))
    const url: URL = new URL(`${domain}vfs`);
    if (root) url.searchParams.set('root', root);
    const xhr: XMLHttpRequest = new XMLHttpRequest();
    xhr.responseType = 'json'; // ответ будет парситься в JSON автоматически
    // GET-запрос будет отправлен на указанный URL в асинхронном режиме (true)
    xhr.open('GET', url, true);

    // обработка выполненного запроса
    xhr.addEventListener('readystatechange', (): void => {
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