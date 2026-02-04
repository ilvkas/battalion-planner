# Deploying Battalion TimePlanner to GitHub

This guide shows you how to host your application for free on GitHub Pages.

## Prerequisites
- A GitHub account.
- Git installed on your computer.

## Step 1: Create a Repository
1.  Go to [GitHub.com](https://github.com) and log in.
2.  Click the **+** icon in the top right and select **New repository**.
3.  Name the repository `battalion-planner`.
    - *Important*: If you choose a different name, you must update the `base` setting in `vite.config.js` to match `/<your-repo-name>/`.
4.  Make sure it is **Public** (GitHub Pages is free for public repos).
5.  Click **Create repository**.

## Step 2: Connect and Push Code
Open a terminal in your project folder (`c:/Progs/battalion-planner`) and run these commands (replace `<YOUR-USERNAME>` with your actual GitHub username):

```powershell
# Add your new repository as a remote
git remote add origin https://github.com/<YOUR-USERNAME>/battalion-planner.git

# Stage all files
git add .

# Commit changes
git commit -m "Initial commit"

# Push code to the main branch
git branch -M main
git push -u origin main
```

## Step 3: Deploy
Run this simple command to build and deploy your app:

```powershell
npm run deploy
```

This command will:
1.  Build your project.
2.  Upload the `dist` folder to a `gh-pages` branch on GitHub.

## Step 4: Verify
1.  Go to your repository on GitHub.
2.  Navigate to **Settings** > **Pages**.
3.  You should see a message saying "Your site is live at..."
4.  Click the link to see your running application!
