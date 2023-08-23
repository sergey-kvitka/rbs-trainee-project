import rootInfo from "./rootInfo";
import render from "./render";
import { handleResponseError } from "./rootInfo"

export const domain: string = window.location.toString();

export const fileContainerId: string = 'vfs-explorer-container';
export const filepathPId: string = 'vfs-current-filepath-p';
export const loadingInfoId: string = 'loading-info';

export class FileInfo {
    name: string;
    isDir: boolean;
    isParentDir: boolean | null;
    path: string;
    havePermission: boolean;
}

// getParentDir возвращает путь 'parent' директории на основе переданного пути.
// В случае, если передана корневая директория, вернётся то же значение
export function getParentDir(path: string): string {
    let nodes: Array<String> = path.split('/');
    nodes.pop();
    return nodes.length > 1 ? nodes.join('/') : '/';
}

export default function main(): void {
    // вызов метода для отправки запроса на получение информации о
    // текущей директории; в качестве параметров переданы путь по умолчанию
    // и обработчики при успешном и неудачном выполнении запроса
    rootInfo(null, render, handleResponseError);
}