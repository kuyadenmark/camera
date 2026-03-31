/**
 * Service for interacting with the Origin Private File System (OPFS).
 * This provides a local, persistent file system for the application.
 */

export interface ContainerFile {
  name: string;
  kind: 'file' | 'directory';
  url?: string;
  blob?: Blob;
}

export interface ContainerFolder {
  name: string;
  path: string;
}

export class StorageService {
  private static ROOT_DIR = 'Karga_Container';

  /**
   * Get the root directory handle for containers.
   */
  private static async getContainersRoot(): Promise<FileSystemDirectoryHandle> {
    const opfsRoot = await navigator.storage.getDirectory();
    return await opfsRoot.getDirectoryHandle(this.ROOT_DIR, { create: true });
  }

  /**
   * List all container folders.
   */
  static async listContainers(): Promise<ContainerFolder[]> {
    try {
      const root = await this.getContainersRoot();
      const folders: ContainerFolder[] = [];
      
      // @ts-ignore - values() is part of the File System Access API
      for await (const entry of root.values()) {
        if (entry.kind === 'directory') {
          folders.push({
            name: entry.name,
            path: `${this.ROOT_DIR}/${entry.name}`
          });
        }
      }
      
      return folders.sort((a, b) => b.name.localeCompare(a.name));
    } catch (error) {
      console.error('Error listing containers:', error);
      return [];
    }
  }

  /**
   * Check if a container folder exists.
   */
  static async folderExists(code: string): Promise<boolean> {
    try {
      const root = await this.getContainersRoot();
      await root.getDirectoryHandle(code, { create: false });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a container folder with photo and video subdirectories.
   */
  static async createFolder(code: string): Promise<void> {
    const root = await this.getContainersRoot();
    const containerFolder = await root.getDirectoryHandle(code, { create: true });
    await containerFolder.getDirectoryHandle('photo', { create: true });
    await containerFolder.getDirectoryHandle('video', { create: true });
  }

  /**
   * Save a file to a specific subdirectory in a container folder.
   */
  static async saveFile(code: string, subDir: string, fileName: string, data: Blob): Promise<void> {
    const root = await this.getContainersRoot();
    const containerFolder = await root.getDirectoryHandle(code, { create: true });
    
    // Handle nested subdirectories
    let targetDir = containerFolder;
    const parts = subDir.split('/').filter(Boolean);
    for (const part of parts) {
      targetDir = await targetDir.getDirectoryHandle(part, { create: true });
    }

    const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
    
    // @ts-ignore - createWritable is part of the File System Access API
    const writable = await (fileHandle as any).createWritable();
    await writable.write(data);
    await writable.close();
  }

  /**
   * Get all files in a container folder, including those in subdirectories.
   */
  static async getContainerFiles(code: string): Promise<ContainerFile[]> {
    try {
      const root = await this.getContainersRoot();
      const containerFolder = await root.getDirectoryHandle(code, { create: false });
      const files: ContainerFile[] = [];

      async function readDir(dirHandle: FileSystemDirectoryHandle, currentPath: string = '') {
        // @ts-ignore - values() is part of the File System Access API
        for await (const entry of (dirHandle as any).values()) {
          if (entry.kind === 'directory') {
            await readDir(entry as FileSystemDirectoryHandle, `${currentPath}${entry.name}/`);
          } else if (entry.kind === 'file') {
            const file = await (entry as FileSystemFileHandle).getFile();
            files.push({
              name: `${currentPath}${entry.name}`,
              kind: 'file',
              blob: file,
              url: URL.createObjectURL(file)
            });
          }
        }
      }

      await readDir(containerFolder);
      return files.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error getting container files:', error);
      return [];
    }
  }

  /**
   * Delete a specific file from a container folder.
   */
  static async deleteFile(code: string, subDir: string, fileName: string): Promise<void> {
    const root = await this.getContainersRoot();
    const containerFolder = await root.getDirectoryHandle(code, { create: false });
    const targetDir = await containerFolder.getDirectoryHandle(subDir, { create: false });
    await targetDir.removeEntry(fileName);
  }

  /**
   * Delete a container folder.
   */
  static async deleteContainer(code: string): Promise<void> {
    const root = await this.getContainersRoot();
    await root.removeEntry(code, { recursive: true });
  }
}
