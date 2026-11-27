'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createPartnerCategory,
  listPartnerCategories,
  PartnerCategory,
  PartnerCategorySkill,
  setPartnerCategoryActive,
  updatePartnerCategory,
} from '@/lib/api/partner-categories';
import { FILTER_ONLY_PARTNER_CATEGORY_IDS } from '@/lib/constants/partner-categories';
import { toast } from 'sonner';

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const createUniqueId = (value: string, existingIds: string[]) => {
  const baseId = slugify(value);
  if (!baseId) return '';
  const knownIds = new Set(existingIds);
  let id = baseId;
  let suffix = 2;
  while (knownIds.has(id)) {
    id = `${baseId}_${suffix}`;
    suffix += 1;
  }
  return id;
};

const newCategory = (): PartnerCategory => ({
  id: '',
  label: '',
  description: '',
  icon: 'Briefcase',
  emoji: '🧰',
  popular: false,
  isActive: true,
  skills: [],
});

export default function PartnerCategoriesPage() {
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState<PartnerCategory[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<PartnerCategory>(newCategory());
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSkillLabel, setNewSkillLabel] = useState('');

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = (await listPartnerCategories(true)).filter(
        (category) => !FILTER_ONLY_PARTNER_CATEGORY_IDS.some((id) => id === category.id),
      );
      setCategories(loaded);
      setSelectedId((current) =>
        loaded.some((category) => category.id === current) ? current : loaded[0]?.id ?? '',
      );
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Failed to load partner categories';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedId),
    [categories, selectedId],
  );
  const totalSkills = categories.reduce((total, category) => total + category.skills.length, 0);

  useEffect(() => {
    if (creating) {
      setDraft(newCategory());
      return;
    }
    if (selectedCategory) setDraft({ ...selectedCategory, skills: [...selectedCategory.skills] });
  }, [creating, selectedCategory]);

  const updateDraft = <K extends keyof PartnerCategory>(
    key: K,
    value: PartnerCategory[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const updateSkill = (index: number, patch: Partial<PartnerCategorySkill>) => {
    setDraft((current) => ({
      ...current,
      skills: current.skills.map((skill, skillIndex) =>
        skillIndex === index ? { ...skill, ...patch } : skill,
      ),
    }));
  };

  const addSkill = () => {
    const label = newSkillLabel.trim();
    const id = createUniqueId(label, draft.skills.map((skill) => skill.id));
    if (!label || !id) {
      toast.error('Enter a skill name');
      return;
    }
    setDraft((current) => ({ ...current, skills: [...current.skills, { id, label }] }));
    setNewSkillLabel('');
  };

  const saveCategory = async () => {
    const label = draft.label.trim();
    const id = creating
      ? createUniqueId(label, [
          ...categories.map((category) => category.id),
          ...FILTER_ONLY_PARTNER_CATEGORY_IDS,
        ])
      : draft.id;
    if (!id || !label || draft.skills.length === 0) {
      toast.error('Add a category name and at least one skill');
      return;
    }
    setSaving(true);
    try {
      const saved = creating
        ? await createPartnerCategory({ ...draft, id, label })
        : await updatePartnerCategory({ ...draft, id, label });
      await queryClient.invalidateQueries({ queryKey: ['partner-category-catalog'] });
      await loadCategories();
      setSelectedId(saved.id);
      setCreating(false);
      toast.success(creating ? 'Category added' : 'Category updated');
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Could not save category');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category: PartnerCategory) => {
    try {
      await setPartnerCategoryActive(category.id, !category.isActive);
      await queryClient.invalidateQueries({ queryKey: ['partner-category-catalog'] });
      await loadCategories();
      toast.success(category.isActive ? 'Category deactivated' : 'Category activated');
    } catch (statusError) {
      toast.error(statusError instanceof Error ? statusError.message : 'Could not update category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partner Categories</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage the categories and skills shown in the partner app.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setCreating(true);
            setSelectedId('');
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add category
        </Button>
      </div>

      <section className="grid grid-cols-2 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-white">
        <div className="p-5">
          <p className="text-sm font-medium text-gray-500">Skill groups</p>
          <p className="text-2xl font-semibold text-gray-900">{categories.length}</p>
        </div>
        <div className="p-5">
          <p className="text-sm font-medium text-gray-500">Skills</p>
          <p className="text-2xl font-semibold text-gray-900">{totalSkills}</p>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <Button type="button" variant="outline" className="ml-3" onClick={() => void loadCategories()}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <p className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
          Loading partner categories…
        </p>
      ) : (
        <section className="grid overflow-hidden rounded-xl border border-gray-200 bg-white lg:grid-cols-2">
          <div className="border-b border-gray-200 lg:border-b-0 lg:border-r">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Skill groups</h2>
              <p className="text-xs text-gray-500">Select a category to edit its skills</p>
            </div>
            <ul className="divide-y divide-gray-100">
              {categories.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setSelectedId(category.id);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left ${
                      !creating && selectedId === category.id ? 'bg-amber-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{category.label}</span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        {category.isActive ? (
                          <><Check className="h-3 w-3 text-emerald-600" /> Active</>
                        ) : (
                          'Inactive'
                        )}
                      </span>
                    </span>
                    <span className="text-xs text-gray-500">{category.skills.length} skills</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {creating ? 'Add category' : draft.label || 'Edit category'}
                </h2>
                <p className="text-xs text-gray-500">
                  Saved changes become available in partner onboarding and category requests.
                </p>
              </div>
              {!creating && selectedCategory && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void toggleActive(selectedCategory)}
                >
                  {selectedCategory.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              )}
            </div>

            {creating || selectedCategory ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="partner-category-label">Category name</Label>
                  <Input
                    id="partner-category-label"
                    value={draft.label}
                    onChange={(event) => {
                      const label = event.target.value;
                      setDraft((current) => ({
                        ...current,
                        label,
                      }));
                    }}
                    placeholder="e.g. Water Tank Cleaning"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner-category-description">Description</Label>
                  <Input
                    id="partner-category-description"
                    value={draft.description}
                    onChange={(event) => updateDraft('description', event.target.value)}
                    placeholder="Short description shown in partner onboarding"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Label>Skills</Label>
                    <span className="text-xs text-gray-500">{draft.skills.length} total</span>
                  </div>
                  <div className="space-y-2">
                    {draft.skills.map((skill, index) => (
                      <Input
                        key={`${skill.id}-${index}`}
                        aria-label={`Skill ${index + 1}`}
                        value={skill.label}
                        onChange={(event) => updateSkill(index, { label: event.target.value })}
                        placeholder="Skill name"
                      />
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      value={newSkillLabel}
                      onChange={(event) => setNewSkillLabel(event.target.value)}
                      placeholder="New skill name"
                    />
                    <Button type="button" variant="outline" onClick={addSkill}>
                      <Plus className="mr-1 h-4 w-4" />
                      Add skill
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                  {creating && (
                    <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                  <Button type="button" disabled={saving} onClick={() => void saveCategory()}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving…' : creating ? 'Create category' : 'Save changes'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Choose a category or add a new one.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
