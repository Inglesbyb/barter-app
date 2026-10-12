import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ImagePlus, X, Sparkles, Check, Search } from 'lucide-react';
import { supabase, unwrap, uploadItemImage } from '../lib/supabase';
import { CONDITIONS, errorMessage, navigate, useApp } from '../lib/core';
import { CATEGORY_DEFINITIONS, suggestCategory } from '../lib/categories';
import { BackButton, PageTitle, Spinner } from '../components/ui';

const MAX_BYTES = 5 * 1024 * 1024;

export default function ListItemView() {
  const { session, showToast } = useApp();
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [hasManuallySelectedCategory, setHasManuallySelectedCategory] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Unique random field key per mount to guarantee browsers do not match old autocomplete/saved info history
  const [fieldKey] = useState(() => Math.random().toString(36).slice(2, 8));

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

  const handleTitleChange = (val) => {
    setTitle(val);
    const suggestion = suggestCategory(val);
    setSuggestedCategory(suggestion);
    if (!hasManuallySelectedCategory && suggestion) {
      setCategory(suggestion);
    }
  };

  const handleSelectCategory = (catName) => {
    setCategory(catName);
    setHasManuallySelectedCategory(true);
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

  const filteredCategories = CATEGORY_DEFINITIONS.filter((c) => {
    if (!catSearch.trim()) return true;
    const term = catSearch.toLowerCase();
    return (
      c.label.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term) ||
      c.keywords.some((kw) => kw.includes(term))
    );
  });

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton />
      <PageTitle title="List an item" subtitle="Add something you'd like to swap." />

      <form onSubmit={submit} className="card space-y-6 p-5 sm:p-7" autoComplete="off" noValidate={false}>
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
            name={`item_title_${fieldKey}`}
            className="field"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Nintendo Switch with 2 controllers"
            minLength={2}
            maxLength={80}
            required
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            aria-autocomplete="none"
          />
        </div>

        {/* Category */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="label mb-0">Category</span>
            {suggestedCategory && category === suggestedCategory && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                <Sparkles size={11} className="shrink-0" /> Suggested from title
              </span>
            )}
          </div>

          {/* Quick Filter */}
          <div className="relative mb-2.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
            <input
              type="search"
              name={`cat_filter_${fieldKey}`}
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Filter categories (e.g. pokemon, collectibles, tools, gaming)..."
              className="w-full rounded-xl border border-line bg-canvas py-2 pl-8 pr-8 text-xs text-ink placeholder:text-muted focus:border-brand focus:bg-white focus:outline-none"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              aria-autocomplete="none"
            />
            {catSearch && (
              <button
                type="button"
                onClick={() => setCatSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Visual Cards Grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            {filteredCategories.map((c) => {
              const Icon = c.icon;
              const active = category === c.label;
              return (
                <button
                  key={c.id}
                  type="button"
                  id={`list-cat-${c.id.replace(/\W+/g, '-').toLowerCase()}`}
                  onClick={() => handleSelectCategory(c.label)}
                  className={`group relative flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-all ${
                    active
                      ? 'border-brand bg-brand-soft/80 shadow-sm ring-1 ring-brand'
                      : 'border-line bg-white hover:border-brand/40 hover:bg-canvas/60'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                      active ? 'bg-brand text-white shadow-sm' : 'bg-canvas text-ink-soft group-hover:bg-brand-soft group-hover:text-brand'
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-bold truncate ${active ? 'text-brand' : 'text-ink'}`}>
                        {c.label}
                      </p>
                      {active && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand text-white ml-1">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted leading-tight">
                      {c.description}
                    </p>
                  </div>
                </button>
              );
            })}
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
            name={`item_desc_${fieldKey}`}
            className="field min-h-28 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Size, age, any wear, and what kind of things you'd swap it for…"
            maxLength={1000}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            aria-autocomplete="none"
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
