import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ImagePlus, X } from 'lucide-react';
import { supabase, unwrap, uploadItemImage } from '../lib/supabase';
import { CATEGORIES, CONDITIONS, errorMessage, navigate, useApp } from '../lib/core';
import { BackButton, PageTitle, Spinner } from '../components/ui';

const MAX_BYTES = 5 * 1024 * 1024;

export default function ListItemView() {
  const { session, showToast } = useApp();
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Release the preview object URL when it changes or on unmount.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Please choose an image file.');
    if (f.size > MAX_BYTES) return setError('Image must be under 5 MB.');
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Add a photo so people can see what you are offering.');
    if (!category) return setError('Choose a category.');
    if (!condition) return setError('Choose a condition.');

    setBusy(true);
    setError('');
    try {
      const imageUrl = await uploadItemImage(session.user.id, file);
      const item = unwrap(
        await supabase
          .from('items')
          .insert({
            user_id: session.user.id,
            title: title.trim(),
            category,
            condition,
            description: description.trim() || null,
            image_url: imageUrl,
          })
          .select('id')
          .single(),
      );
      showToast('Your item is live!');
      navigate(`/item/${item.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton />
      <PageTitle title="List an item" subtitle="Add something you'd like to swap." />

      <form onSubmit={submit} className="card space-y-6 p-5 sm:p-7">
        {/* Photo */}
        <div>
          <span className="label">Photo</span>
          <input ref={fileInput} id="list-photo-input" type="file" accept="image/*" className="hidden" onChange={pickFile} />
          {preview ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-2xl">
              <img src={preview} alt="Preview" className="aspect-[4/3] w-full object-cover" />
              <div className="absolute right-3 top-3 flex gap-2">
                <button type="button" onClick={() => fileInput.current.click()} className="btn bg-white/90 px-3 py-1.5 text-ink backdrop-blur">
                  <Camera size={15} /> Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="btn bg-white/90 p-1.5 text-ink backdrop-blur"
                  aria-label="Remove photo"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              type="button"
              id="list-photo-button"
              onClick={() => fileInput.current.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-canvas text-ink-soft transition hover:border-brand hover:bg-brand-soft/40 hover:text-brand"
            >
              <ImagePlus size={32} />
              <span className="font-semibold">Add a photo</span>
              <span className="text-xs text-muted">JPG, PNG or WEBP · max 5 MB</span>
            </button>
          )}
        </div>

        {/* Title */}
        <div>
          <label htmlFor="list-title" className="label">
            Title
          </label>
          <input
            id="list-title"
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Nintendo Switch with 2 controllers"
            minLength={2}
            maxLength={80}
            required
          />
        </div>

        {/* Category */}
        <div>
          <span className="label">Category</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                id={`list-cat-${c.replace(/\W+/g, '-').toLowerCase()}`}
                onClick={() => setCategory(c)}
                className={category === c ? 'chip-on' : 'chip-off'}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div>
          <span className="label">Condition</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                id={`list-cond-${c.replace(/\W+/g, '-').toLowerCase()}`}
                onClick={() => setCondition(c)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  condition === c ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-ink-soft hover:border-brand/40'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="list-description" className="label">
            Description <span className="normal-case tracking-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="list-description"
            className="field min-h-28 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Size, age, any wear, and what kind of things you'd swap it for…"
            maxLength={1000}
          />
        </div>

        {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}

        <button id="list-submit" type="submit" className="btn-primary w-full py-3.5 text-base" disabled={busy}>
          {busy ? <Spinner className="h-5 w-5 text-white" /> : 'Publish listing'}
        </button>
      </form>
    </div>
  );
}
