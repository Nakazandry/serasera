import { FiImage } from 'react-icons/fi';

export default function ProductImage({ src, alt = 'Produit', className = '', iconClassName = 'text-3xl' }) {
  if (src) {
    return <img className={className} src={src} alt={alt} />;
  }

  return (
    <div className={`grid place-items-center bg-slate-900/80 text-slate-400 ${className}`} role="img" aria-label={alt}>
      <FiImage className={iconClassName} />
    </div>
  );
}
