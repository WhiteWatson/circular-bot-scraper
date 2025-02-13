import fs from 'fs';
import path from 'path';

export const saveToJson = async (
    data: any,
    directory: string,
    prefix: string = 'data'
): Promise<string> => {
    // 确保目录存在
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }

    // 生成带时间戳的文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${prefix}-${timestamp}.json`;
    const filePath = path.join(directory, fileName);

    // 写入文件
    await fs.promises.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf8'
    );

    return filePath;
}; 