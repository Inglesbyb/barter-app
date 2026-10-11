import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { ItemImage, StatusBadge } from './ui';
import { navigate } from '../lib/core';

export default function ItemCard({ item, showStatus = false, index = 0 }) {
  return (
    <motion.button
      type="button"
      id={`item-card-${item.id}`}
      onClick={() => navigate(`/item/${item.id}`)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      whileHover={{ y: -4 }}
      className="card group overflow-hidden text-left transition-shadow hover:shadow-lift"
    >
      <div className="relative aspect-square overflow-hidden">
        <ItemImage
          src={item.image_url}
          alt={item.title}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        <span className="badge absolute left-2.5 top-2.5 bg-white/90 text-ink-soft backdrop-blur">{item.condition}</span>
        {showStatus && item.status !== 'available' && (
          <span className="absolute right-2.5 top-2.5">
            <StatusBadge status={item.status} />
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate font-semibold text-ink">{item.title}</h3>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{item.category}</span>
          {item.owner?.location_name && (
            <span className="flex min-w-0 items-center gap-0.5 truncate">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{item.owner.location_name}</span>
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
