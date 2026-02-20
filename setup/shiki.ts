import { defineShikiSetup } from '@slidev/types'

export default defineShikiSetup(() => {
  return {
    themes: {
      dark: 'dracula',
      light: 'dracula',
    },
    langs: [
      'java',
      'bash',
      'js',
      'typescript',
      'python',
    ],
  }
})
