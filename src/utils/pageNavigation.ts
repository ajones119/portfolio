// Page navigation configuration
export interface PageInfo {
    index: number;
    id: string;
    name: string;
    label: string;
    href: string;
}

// Navigation card styling by position (0-indexed)
const NAV_STYLES = [
    { borderColor: 'border-quaternary', bgClass: 'card-bg-quaternary' },
    { borderColor: 'border-primary', bgClass: 'card-bg-primary' },
    { borderColor: 'border-secondary', bgClass: 'card-bg-secondary' },
];

export const PAGES: PageInfo[] = [
    {
        index: 0,
        id: 'about-me',
        name: 'about-me',
        label: 'About Me',
        href: '#about-me',
    },
    {
        index: 1,
        id: 'projects',
        name: 'projects',
        label: 'Projects',
        href: '#projects',
    },
    {
        index: 2,
        id: 'tools',
        name: 'tools',
        label: 'Tools',
        href: '#tools',
    },
    {
        index: 3,
        id: 'dungeons-and-dragons',
        name: 'dungeons-and-dragons',
        label: 'D&D',
        href: '#dungeons-and-dragons',
    },
];

/**
 * Get navigation card style by position (0, 1, or 2 for the 3 nav cards)
 */
export function getNavStyle(position: number) {
    return NAV_STYLES[position % NAV_STYLES.length];
}

/**
 * Get navigation pages (excludes the current page)
 */
export function getNavPages(currentPageIndex: number): PageInfo[] {
    return PAGES.filter(page => page.index !== currentPageIndex);
}

