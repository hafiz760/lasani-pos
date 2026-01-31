import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function uploadFile(file: File): Promise<string | null> {
    if (!file) return null;

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const originalName = file.name;
        const extension = originalName.split('.').pop();
        const fileName = `${uuidv4()}.${extension}`;

        // Ensure directory exists
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        // Save to public/uploads
        const path = join(uploadDir, fileName);
        await writeFile(path, buffer);

        // Return public URL
        return `/uploads/${fileName}`;
    } catch (error) {
        console.error('Error uploading file:', error);
        return null;
    }
}
