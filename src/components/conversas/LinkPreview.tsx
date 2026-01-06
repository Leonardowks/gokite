import { memo, useEffect, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

interface LinkPreviewProps {
  url: string;
  isFromMe?: boolean;
}

// Cache simples para evitar re-fetches
const metadataCache = new Map<string, LinkMetadata | null>();

export const LinkPreview = memo(function LinkPreview({ url, isFromMe = false }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      // Checar cache primeiro
      if (metadataCache.has(url)) {
        setMetadata(metadataCache.get(url) || null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(false);

        // Para domínios conhecidos, extrair informações básicas
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        
        // Metadata básico baseado no hostname
        const basicMetadata: LinkMetadata = {
          siteName: hostname.charAt(0).toUpperCase() + hostname.slice(1),
        };

        // Tentar extrair título de URLs comuns
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
          basicMetadata.siteName = 'YouTube';
          basicMetadata.title = 'Vídeo do YouTube';
        } else if (hostname.includes('instagram.com')) {
          basicMetadata.siteName = 'Instagram';
          basicMetadata.title = 'Publicação do Instagram';
        } else if (hostname.includes('facebook.com')) {
          basicMetadata.siteName = 'Facebook';
          basicMetadata.title = 'Publicação do Facebook';
        } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
          basicMetadata.siteName = 'X (Twitter)';
          basicMetadata.title = 'Post do X';
        } else if (hostname.includes('linkedin.com')) {
          basicMetadata.siteName = 'LinkedIn';
          basicMetadata.title = 'Publicação do LinkedIn';
        } else if (hostname.includes('wa.me') || hostname.includes('whatsapp.com')) {
          basicMetadata.siteName = 'WhatsApp';
          basicMetadata.title = 'Link do WhatsApp';
        } else {
          basicMetadata.title = decodeURIComponent(urlObj.pathname.split('/').filter(Boolean).pop() || hostname);
        }

        metadataCache.set(url, basicMetadata);
        setMetadata(basicMetadata);
      } catch (err) {
        console.error('Error parsing URL:', err);
        setError(true);
        metadataCache.set(url, null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  // Não renderizar se erro ou sem metadata
  if (error || (!isLoading && !metadata)) return null;

  const hostname = (() => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  })();

  if (isLoading) {
    return (
      <div className={cn(
        'mt-2 rounded-lg overflow-hidden border',
        isFromMe ? 'border-white/20' : 'border-border/50'
      )}>
        <div className="p-2.5 space-y-1.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'mt-2 block rounded-lg overflow-hidden border transition-all',
        isFromMe 
          ? 'border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10' 
          : 'border-border/50 hover:border-border bg-muted/30 hover:bg-muted/50'
      )}
    >
      <div className="p-2.5 flex items-start gap-2.5">
        <div className={cn(
          'h-9 w-9 shrink-0 rounded-md flex items-center justify-center',
          isFromMe ? 'bg-white/10' : 'bg-muted'
        )}>
          <Globe className={cn(
            'h-4 w-4',
            isFromMe ? 'text-white/70' : 'text-muted-foreground'
          )} />
        </div>
        
        <div className="flex-1 min-w-0 space-y-0.5">
          {metadata?.title && (
            <p className={cn(
              'text-sm font-medium line-clamp-1',
              isFromMe ? 'text-white' : 'text-foreground'
            )}>
              {metadata.title}
            </p>
          )}
          
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'text-xs',
              isFromMe ? 'text-cyan-300' : 'text-primary'
            )}>
              {hostname}
            </span>
            <ExternalLink className={cn(
              'h-3 w-3',
              isFromMe ? 'text-white/50' : 'text-muted-foreground'
            )} />
          </div>
        </div>
      </div>
    </a>
  );
});
