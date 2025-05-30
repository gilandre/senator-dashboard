export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  DISPLAY_SHORT: 'd LLL y',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: 'yyyy-MM-dd HH:mm:ss',
} as const;

export const TOAST_CONFIG = {
  LIMIT: 3,
  REMOVE_DELAY: 5000, // 5 secondes
  ANIMATION_DURATION: 300,
} as const;

export const DATE_PICKER_PRESETS = [
  {
    name: "Aujourd'hui",
    range: {
      from: new Date(),
      to: new Date(),
    },
  },
  {
    name: "7 derniers jours",
    range: {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
  },
  {
    name: "14 derniers jours",
    range: {
      from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
  },
  {
    name: "30 derniers jours",
    range: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
  },
] as const; 