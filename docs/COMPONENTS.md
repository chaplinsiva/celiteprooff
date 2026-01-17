# CelitePro Components Documentation

## Component Hierarchy

```
App
├── Header
├── Hero
├── Templates
│   └── TemplateCard (multiple)
├── TemplateDetail (modal)
└── Editor (modal)
```

## Components

### Header
**Path:** `src/components/Header.tsx`

Navigation header with logo, links, and mobile menu.

```tsx
import Header from '@/components/Header';

<Header />
```

### Hero
**Path:** `src/components/Hero.tsx`

Landing page hero section with animated background.

```tsx
import Hero from '@/components/Hero';

<Hero />
```

### Templates
**Path:** `src/components/Templates.tsx`

Template gallery with search and filtering.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `onSelectTemplate` | `(template: Template) => void` | Called when template is clicked |

```tsx
import Templates from '@/components/Templates';

<Templates onSelectTemplate={(t) => console.log(t)} />
```

### TemplateCard
**Path:** `src/components/TemplateCard.tsx`

Individual template card with video preview.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `template` | `Template` | Template data |
| `onClick` | `() => void` | Click handler |

### TemplateDetail
**Path:** `src/components/TemplateDetail.tsx`

Full-screen template detail modal.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `template` | `Template` | Template data |
| `onEdit` | `() => void` | Opens editor |
| `onClose` | `() => void` | Closes modal |

### Editor
**Path:** `src/components/Editor.tsx`

Template customization editor with render functionality.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `template` | `Template` | Template to edit |
| `onClose` | `() => void` | Closes editor |

**Features:**
- Text input fields for text placeholders
- Color picker for color placeholders
- File upload for image placeholders
- Render progress indicator
- Preview and download links after render

## Types

```typescript
interface Template {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  preview_video: string | null;
  zip_path: string;
  placeholders: Placeholder[];
  created_at: string;
}

interface Placeholder {
  name: string;
  type: 'text' | 'color' | 'image' | 'video';
  default_value?: string;
  label?: string;
}
```
