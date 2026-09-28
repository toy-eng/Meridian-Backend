# StaffSync screenshots

Captures portfolio-ready screenshots of the StaffSync app with your real Chrome,
signed in as the demo account, at your system viewport (1366x768) rendered at 2x.

## Run it

```powershell
cd "C:\Users\Taslim Yusuf\Desktop\StaffSync Backend\tools\screenshots"
npm install
npm run shots
```

The PNGs land in `tools\screenshots\shots\`.

The script pings the backend first, so the first run may sit for a minute while
Render's free tier wakes up. That is normal.

## Pages captured

| File | Page |
| --- | --- |
| `01-landing.png` | Public landing page |
| `02-login.png` | Login |
| `03-create-account.png` | Create account |
| `04-forgot-password.png` | Forgot password |
| `05-dashboard.png` | Dashboard overview |
| `06-employees.png` | Employees list |
| `07-employee-detail.png` | A single employee |
| `08-departments.png` | Departments list |
| `09-department-detail.png` | A single department |
| `10-reports.png` | Reports |
| `11-settings.png` | Settings |

## Useful options

```powershell
npm run shots -- --full              # whole scrollable page instead of the viewport
npm run shots -- --only=reports      # just the pages whose name matches
npm run shots -- --height=900        # different viewport height
npm run shots -- --scale=1           # 1x images (smaller files)
npm run shots -- --headed            # watch the browser work
npm run shots -- --base=http://localhost:5173   # use the local dev server instead
```

Run `node capture.js --help` for the full list.

## Notes

- To use the local dev server, fix `VITE_API_BASE_URL` in the frontend `.env`
  first - it still points at the old Heroku URL.
- If Chrome cannot be found, set `CHROME_PATH` to your browser executable.
- `node_modules/` and `shots/` are gitignored.
