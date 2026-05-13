'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  className?: string;
}

export default function ImageUpload({ value, onChange, onRemove, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Type non supporté (jpg, png, gif, webp)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 5 Mo)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = typeof window !== 'undefined' ? localStorage.getItem('lp_token') : null;
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Erreur lors de l'upload");
        return;
      }

      setPreview(data.url);
      onChange(data.url);
      toast.success('Image téléchargée');
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadFile]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    onRemove?.();
  }, [onRemove]);

  if (preview) {
    return (
      <div className={cn('relative rounded-lg overflow-hidden border border-border/50', className)}>
        <div className="relative aspect-video bg-muted/30">
          <img
            src={preview}
            alt="Aperçu"
            className="w-full h-full object-cover"
          />
        </div>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md"
          onClick={handleRemove}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-all duration-200',
        dragOver
          ? 'border-primary bg-primary/5'
          : 'border-border/50 hover:border-primary/50 hover:bg-muted/30',
        uploading && 'pointer-events-none opacity-60',
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      {uploading ? (
        <>
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Envoi en cours...</p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
            <ImagePlus className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Glissez une image ici</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ou cliquez pour parcourir · JPG, PNG, GIF, WebP · max 5 Mo
            </p>
          </div>
        </>
      )}
    </div>
  );
}
