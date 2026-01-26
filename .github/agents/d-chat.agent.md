---
description: 'Create a One to ONe Chat Application using Angular and Angular Aria Retro and Supabase.'
tools:
  [
    'vscode',
    'execute',
    'read',
    'edit',
    'search',
    'web',
    'github/*',
    'github/*',
    'agent',
    'gitkraken/*',
    'sonarsource.sonarlint-vscode/sonarqube_getPotentialSecurityIssues',
    'sonarsource.sonarlint-vscode/sonarqube_excludeFiles',
    'sonarsource.sonarlint-vscode/sonarqube_setUpConnectedMode',
    'sonarsource.sonarlint-vscode/sonarqube_analyzeFile',
    'todo',
  ]
---

use the Angular framework along with Angular Aria Retro design system to create a One to One Chat Application named D-Chat. Use Supabase as the backend service for authentication and real-time messaging. Follow these steps:

1. We aleady have a dashboard layout component. Add a navigation link to the D-Chat feature in the dashboard layout component's HTML file.
2. Create a new Angular feature module named D-Chat. This module should contain:
   - A service named DChatService to handle authentication and messaging using Supabase.
   - A component named DChatComponent for the chat interface.
   - A routing module to define routes for the D-Chat feature.
3. In the DChatService, implement methods for messageing and authentication using Supabase.
4. In the DChatComponent, create a user interface that allows users to send and receive messages in real-time use Supabase real time . Use Angular Aria Retro components for styling.
5. Ensure that the D-Chat feature is lazy-loaded in the main application routing module.
6. We already build the authentication service. Integrate it with the D-Chat feature to manage user sessions.
7. We have integrated Supabase service in the core module. Use it in the DChatService for all Supabase interactions.
8. Test the D-Chat feature thoroughly to ensure real-time messaging works as expected and the UI is responsive and user-friendly.
9. Create multiple reusable components if needed.
10. We needed a one to one chat application.
11. Color can be retro style using Angular Aria Retro design system and our custome theme.
12. Should look like a game chat application.
13. Should have online/offline status indicator.
14. Use icons from FontAwesome for chat actions (send, attach, emoji, etc.).
15. Should look like Matrix Movie chat interface with retro theme in Green and Black.
16. No changes can be made to existing files except the dashboard layout component HTML file and the main routing module for lazy loading.
17. After completing the implementation, provide a todo list of tasks that were completed to build the D-Chat feature.
18. Unit Tests must be written for all components including the DChatService and DChatComponent to ensure reliability and maintainability.
19. D-Chat is a covert communication tool for gamers, designed with a retro aesthetic inspired by classic arcade games. It features a sleek black and green interface reminiscent of old-school computer terminals, complete with pixelated fonts and neon accents. The application allows users to engage in one-on-one chats, providing real-time messaging capabilities powered by Supabase. Users can see each other's online/offline status through intuitive indicators, enhancing the sense of connectivity. The chat interface includes familiar gaming icons from FontAwesome for actions like sending messages, attaching files, and adding emojis, all styled to fit the retro theme. Overall, D-Chat combines nostalgia with modern functionality, creating a unique communication experience for gamers.
20. No need to create any .md documentation files until asked.
21. If any such documentation files are found, edit them to reflect the D-Chat feature implementation move them to the .agent folder.
