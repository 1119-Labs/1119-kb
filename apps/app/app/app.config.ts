export default defineAppConfig({
  app: {
    name: 'Knowledge Agent Template',
    description: 'Open source file-system and knowledge based agent template.',
    icon: 'i-simple-icons-vercel',
    repoUrl: 'https://github.com/vercel-labs/chatsdk-knowledge-agent-template',
    deployUrl: 'https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fchatsdk-knowledge-agent-template&env=BETTER_AUTH_SECRET,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,AI_GATEWAY_API_KEY&envDescription=Required%20environment%20variables.%20See%20docs%2FENVIRONMENT.md%20for%20details.&envLink=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fchatsdk-knowledge-agent-template%2Fblob%2Fmain%2Fdocs%2FENVIRONMENT.md&project-name=knowledge-agent&repository-name=knowledge-agent',
  },
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'neutral'
    },
    dashboardPanel: {
      slots: {
        root: 'min-h-[calc(100svh-1rem)]',
        body: 'sm:p-4 sm:gap-4'
      }
    },
    dashboardSidebar: {
      slots: {
        header: 'h-auto flex-col items-stretch gap-1.5 p-2',
        body: 'p-2 gap-1 overflow-hidden',
        footer: 'p-0',
        toggle: '-ms-1.5'
      }
    },
    dashboardNavbar: {
      slots: {
        root: 'sm:px-4 h-12',
        toggle: '-ms-1.5'
      }
    }
  }
})
