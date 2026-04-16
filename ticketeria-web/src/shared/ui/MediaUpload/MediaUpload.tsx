import React, { useState, useRef, useCallback } from 'react';
import { Icon } from '@shared/ui/Icon/Icon';
import styles from './MediaUpload.module.css';

export interface MediaUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  existingImages?: Array<{ id: string; url: string; name: string }>;
  onRemoveExisting?: (id: string) => void;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = 5,
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  existingImages = [],
  onRemoveExisting,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFiles = useCallback((filesToValidate: File[]): { valid: File[]; errors: string[] } => {
    const validatedErrors: string[] = [];
    const validFiles: File[] = [];

    const totalFiles = selectedFiles.length + existingImages.length + filesToValidate.length;
    if (totalFiles > maxFiles) {
      validatedErrors.push(`Limite maximo: ${maxFiles} arquivos`);
      return { valid: validFiles, errors: validatedErrors };
    }

    filesToValidate.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        validatedErrors.push(`${file.name} nao eh uma imagem`);
      } else if (file.size > maxSizeBytes) {
        validatedErrors.push(`${file.name} excede ${maxSizeMB}MB`);
      } else {
        validFiles.push(file);
      }
    });

    return { valid: validFiles, errors: validatedErrors };
  }, [selectedFiles, maxFiles, maxSizeBytes, maxSizeMB, existingImages.length]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const { valid, errors: newErrors } = validateFiles(fileArray);

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    const newPreviews = valid.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    const updatedFiles = [...selectedFiles, ...valid];
    setSelectedFiles(updatedFiles);
    setPreviews([...previews, ...newPreviews]);
    onFilesChange(updatedFiles);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [validateFiles, selectedFiles, previews, onFilesChange]);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    const fileToRemove = previews[index];
    URL.revokeObjectURL(fileToRemove.url);

    const updatedPreviews = previews.filter((_, i) => i !== index);
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);

    setPreviews(updatedPreviews);
    setSelectedFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const handleRemoveExisting = (id: string) => {
    onRemoveExisting?.(id);
  };

  const totalImages = selectedFiles.length + existingImages.length;
  const remainingSlots = maxFiles - totalImages;

  return (
    <div className={styles.container}>
      {/* Drop Zone */}
      <div
        className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className={styles.dropContent}>
          <Icon name="download" size={32} className={styles.icon} />
          <h3 className={styles.dropTitle}>Arraste imagens aqui</h3>
          <p className={styles.dropSubtitle}>ou</p>
          <button
            type="button"
            className={styles.browseButton}
            onClick={handleBrowseClick}
          >
            Procurar arquivos
          </button>
          <p className={styles.dropHint}>JPG, PNG, WebP ou GIF ate {maxSizeMB}MB</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className={styles.hiddenInput}
          aria-label="Upload de midia"
        />
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className={styles.errorBox}>
          {errors.map((error, idx) => (
            <div key={idx} className={styles.errorItem}>
              <Icon name="warning" size={16} />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Image Info */}
      {totalImages > 0 && (
        <div className={styles.info}>
          <span className={styles.infoText}>
            {totalImages} de {maxFiles} imagens {remainingSlots === 1 ? '(1 espaco restante)' : remainingSlots > 0 ? `(${remainingSlots} espacos restantes)` : '(limite atingido)'}
          </span>
        </div>
      )}

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div>
          <h4 className={styles.sectionTitle}>Imagens existentes</h4>
          <div className={styles.gallery}>
            {existingImages.map((image) => (
              <div key={image.id} className={styles.thumbnailWrapper}>
                <div className={styles.thumbnail}>
                  <img src={image.url} alt={image.name} className={styles.image} />
                  <div className={styles.overlay}>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemoveExisting(image.id)}
                      title="Remover imagem"
                      aria-label={`Remover ${image.name}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
                <p className={styles.filename}>{image.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Files Preview */}
      {previews.length > 0 && (
        <div>
          <h4 className={styles.sectionTitle}>Novas imagens ({previews.length})</h4>
          <div className={styles.gallery}>
            {previews.map((preview, index) => (
              <div key={`${preview.file.name}-${index}`} className={styles.thumbnailWrapper}>
                <div className={styles.thumbnail}>
                  <img src={preview.url} alt={preview.file.name} className={styles.image} />
                  {uploadProgress[index] !== undefined && uploadProgress[index] < 100 && (
                    <div className={styles.progressContainer}>
                      <div
                        className={styles.progressBar}
                        style={{ width: `${uploadProgress[index]}%` }}
                      />
                    </div>
                  )}
                  <div className={styles.overlay}>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeFile(index)}
                      title="Remover arquivo"
                      aria-label={`Remover ${preview.file.name}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
                <p className={styles.filename}>{preview.file.name}</p>
                <p className={styles.filesize}>
                  {(preview.file.size / 1024 / 1024).toFixed(2)}MB
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

MediaUpload.displayName = 'MediaUpload';
