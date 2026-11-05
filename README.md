# My Blog

An Express and EJS blogging app with MongoDB persistence, writer accounts, public author profiles, author-only article management, and live feed updates.

## Requirements

- Node.js
- A MongoDB Atlas database (or another MongoDB deployment)

## Configure MongoDB

Set `MONGODB_URI` in the terminal before starting the server. Keep the connection string private and do not commit it.

In PowerShell:

```powershell
$env:MONGODB_URI = "mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority"
npm run devStart
```

In Command Prompt:

```bat
set MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
npm run devStart
```

Replace the placeholders with the database credentials and database name from your Atlas cluster. Atlas must allow connections from your current network. The app will report a clear startup error if `MONGODB_URI` is missing or the database cannot be reached.

For production, set `NODE_ENV=production` and `PORT` as appropriate. The session cookie is marked `Secure` in production.

## Features

- Register and sign in with individual writer accounts.
- Create, edit, and delete your own articles.
- Discover and search public articles; open articles on their own reading pages.
- View and edit writer profiles and browse their published articles.
- See feed changes in open browser tabs via Server-Sent Events.
- Responsive interface with shared navigation/footer and the image in `assets/blog_background.jpeg`.

The live feed event stream is delivered by the running app process. If you deploy multiple app instances, connect them to a shared pub/sub service to broadcast events between instances.
