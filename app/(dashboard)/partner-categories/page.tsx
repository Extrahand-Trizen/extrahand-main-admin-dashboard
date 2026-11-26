'use client';

import { useState } from 'react';
import { Check, ChevronRight, Layers3, ListChecks } from 'lucide-react';
import {
  getPartnerCategoryLabel,
  PARTNER_APP_CATEGORY_IDS,
  PARTNER_CATEGORY_SKILLS,
} from '@/lib/constants/partner-categories';

const partnerCategories = PARTNER_APP_CATEGORY_IDS.map((id) => ({
  id,
  label: getPartnerCategoryLabel(id),
  skills: Object.entries(PARTNER_CATEGORY_SKILLS[id] ?? {}).map(([skillId, label]) => ({
    id: skillId,
    label,
  })),
}));

const totalSkills = partnerCategories.reduce((total, category) => total + category.skills.length, 0);

export default function PartnerCategoriesPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    partnerCategories[0]?.id ?? '',
  );
  const selectedCategory =
    partnerCategories.find((category) => category.id === selectedCategoryId) ?? partnerCategories[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Partner Categories</h1>
        <p className="mt-2 text-sm text-gray-600">
          Browse the categories and skills available in the partner app.
        </p>
      </div>

      <section
        aria-label="Partner app category summary"
        className="grid grid-cols-2 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-white"
      >
        <div className="flex items-center gap-3 p-5">
          <span className="rounded-lg bg-amber-50 p-2.5 text-amber-700">
            <Layers3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-gray-500">Skill groups</p>
            <p className="text-2xl font-semibold text-gray-900">{partnerCategories.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-5">
          <span className="rounded-lg bg-amber-50 p-2.5 text-amber-700">
            <ListChecks className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-gray-500">Skills</p>
            <p className="text-2xl font-semibold text-gray-900">{totalSkills}</p>
          </div>
        </div>
      </section>

      <section className="grid overflow-hidden rounded-xl border border-gray-200 bg-white md:grid-cols-2">
        <div className="min-w-0 border-b border-gray-200 md:border-b-0 md:border-r">
          <div className="flex min-h-16 items-center justify-between border-b border-gray-200 px-5 py-3">
            <div>
              <h2 className="font-semibold text-gray-900">Skill groups</h2>
              <p className="text-xs text-gray-500">Top level categories</p>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {partnerCategories.length}
            </span>
          </div>
          <ul aria-label="Partner app categories" className="divide-y divide-gray-100">
            {partnerCategories.map((category) => {
              const isSelected = category.id === selectedCategory?.id;
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors ${
                      isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {category.label}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Active
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                      {category.skills.length} skills
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0">
          <div className="flex min-h-16 items-center justify-between border-b border-gray-200 px-5 py-3">
            <div>
              <h2 className="font-semibold text-gray-900">
                Skills{selectedCategory ? ` (${selectedCategory.label})` : ''}
              </h2>
              <p className="text-xs text-gray-500">From the partner app</p>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {selectedCategory?.skills.length ?? 0}
            </span>
          </div>
          {selectedCategory && selectedCategory.skills.length > 0 ? (
            <ul aria-label={`${selectedCategory.label} skills`} className="divide-y divide-gray-100">
              {selectedCategory.skills.map((skill) => (
                <li
                  key={skill.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {skill.label}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Active
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-gray-500">No skills are listed for this category.</p>
          )}
        </div>
      </section>
    </div>
  );
}
