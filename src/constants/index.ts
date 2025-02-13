import path from 'path';

export const URLS = {
    MAIN_PAGE: 'https://www.circular.bot/'
} as const;

export const SELECTORS = {
    TARGET_ELEMENT: 'body > div.flex.h-screen.overflow-hidden > main > div > div > div > div.fixed.bottom-0.left-0.lg\\:left-72.right-0.translate-y-\\[20\\%\\].sm\\:translate-y-0.transition-transform > div > div > div.jsx-810b6accf40a29bd.w-full.overflow-x-auto.hide-scrollbar.cursor-grab.active\\:cursor-grabbing.h-\\[267px\\].sm\\:h-\\[267px\\] > div'
} as const;

export const CRON_SCHEDULE = '*/30 * * * *';

export const PATHS = {
    DATA_DIR: path.join(process.cwd(), 'data'),
    WALLETS_DIR: path.join(process.cwd(), 'data', 'wallets')
} as const; 