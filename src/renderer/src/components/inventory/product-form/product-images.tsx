import { Upload, X } from 'lucide-react'

interface ProductImagesProps {
  imagePreviews: string[]
  setImagePreviews: React.Dispatch<React.SetStateAction<string[]>>
  selectedFiles: File[]
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>
}

export function ProductImages({
  imagePreviews,
  setImagePreviews,
  selectedFiles,
  setSelectedFiles
}: ProductImagesProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedFiles((prev) => [...prev, ...files])

      const newPreviews: string[] = []
      for (const file of files) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = (error) => reject(error)
          })
          newPreviews.push(base64)
        } catch (err) {
          console.error('Failed to generate preview for', file.name, err)
        }
      }
      setImagePreviews((prev) => [...prev, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Product Images</h2>
      <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg border-2 border-dashed border-border">
        {imagePreviews.map((url, index) => (
          <div
            key={index}
            className="relative w-28 h-28 rounded-lg border-2 border-border overflow-hidden group shadow-md hover:shadow-lg transition-shadow"
          >
            <img src={url} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <label className="w-28 h-28 rounded-lg border-2 border-dashed border-muted-foreground/50 hover:border-[#4ade80] hover:bg-[#4ade80]/10 flex flex-col items-center justify-center cursor-pointer transition-all bg-background shadow-sm hover:shadow-md">
          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-xs text-muted-foreground font-semibold">Add Image</span>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Supported formats: PNG, JPG, JPEG, WEBP (Max 5MB per image)
      </p>
    </div>
  )
}
