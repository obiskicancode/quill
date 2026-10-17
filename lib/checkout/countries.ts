/** Sample list. Extend it, or swap in a full ISO list. `dial` is the country calling code without "+". */
export interface Country {
  code: string
  name: string
  dial: string
}

export const countries: Country[] = [
  { code: 'NG', name: 'Nigeria', dial: '234' },
  { code: 'GH', name: 'Ghana', dial: '233' },
  { code: 'KE', name: 'Kenya', dial: '254' },
  { code: 'ZA', name: 'South Africa', dial: '27' },
  { code: 'CM', name: 'Cameroon', dial: '237' },
  { code: 'SN', name: 'Senegal', dial: '221' },
  { code: 'GB', name: 'United Kingdom', dial: '44' },
  { code: 'US', name: 'United States', dial: '1' },
  { code: 'CA', name: 'Canada', dial: '1' },
  { code: 'AE', name: 'United Arab Emirates', dial: '971' },
  { code: 'FR', name: 'France', dial: '33' },
  { code: 'DE', name: 'Germany', dial: '49' },
  { code: 'IN', name: 'India', dial: '91' },
  { code: 'CN', name: 'China', dial: '86' },
]

export const dialFor = (code: string): string => countries.find((c) => c.code === code)?.dial ?? '234'
