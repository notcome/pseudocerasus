export type Browser = 'safari' | 'chrome' | 'other'

export function detectBrowser(): Browser {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.indexOf('safari') === -1) {
    return 'other'
  }
  if (ua.indexOf('chrome') > -1) {
    return 'chrome'
  }
  return 'safari'
}
