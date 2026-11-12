using System;
using System.IO;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using System.IO.Compression;
using System.Runtime.InteropServices;

namespace VintteaLauncher
{
    static class Program
    {
        [DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        [STAThread]
        static void Main()
        {
            try
            {
                if (Environment.OSVersion.Version.Major >= 6)
                {
                    SetProcessDPIAware();
                }
            }
            catch { }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Enable TLS 1.2 for modern GitHub API HTTPS requests
            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; // Tls12
            }
            catch { }

            Application.Run(new MainForm());
        }
    }

    public class MainForm : Form
    {
        // App metadata
        public static string CurrentVersion
        {
            get
            {
                try
                {
                    string packagePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "package.json");
                    Match versionMatch = Regex.Match(File.ReadAllText(packagePath), "\\\"version\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"");
                    if (versionMatch.Success) return versionMatch.Groups[1].Value;
                }
                catch { }

                return "0.0.0";
            }
        }
        public const string GitHubRepo = "nehuenmattea/Vinttea";

        // Colors
        private readonly Color BgDark = Color.FromArgb(15, 17, 26);
        private readonly Color CardBg = Color.FromArgb(24, 28, 43);
        private readonly Color CardBorder = Color.FromArgb(42, 50, 75);
        private readonly Color AccentIndigo = Color.FromArgb(129, 140, 248);
        private readonly Color AccentRose = Color.FromArgb(255, 51, 102);
        private readonly Color AccentGreen = Color.FromArgb(16, 185, 129);
        private readonly Color AccentRed = Color.FromArgb(239, 68, 68);
        private readonly Color TextPrimary = Color.FromArgb(248, 250, 252);
        private readonly Color TextMuted = Color.FromArgb(148, 163, 184);

        // State
        private string appDir;
        private Process serverProcess = null;
        private System.Windows.Forms.Timer statusTimer;
        private NotifyIcon trayIcon;
        private ContextMenuStrip trayMenu;

        // UI Controls
        private Panel headerPanel;
        private Panel reqCard;
        private Panel serverCard;
        private Label lblNodeStatus;
        private Label lblPnpmStatus;
        private Label lblBuildStatus;
        private Button btnFixReqs;
        private Button btnCreateShortcut;

        private Label lblServerBadge;
        private Label lblLocalUrl;
        private Label lblNetworkUrl;
        private Label lblClientsInfo;
        private Button btnStartStopServer;
        private Button btnOpenBrowser;
        private Button btnShowQR;
        private Button btnExtensionFolder;
        private Button btnCheckUpdates;
        private Button btnOpenReleases;
        private Panel updateCard;
        private Label lblUpdateStatus;
        private Label lblUpdateProgress;
        private ProgressBar updateProgressBar;
        private TextBox txtLog;
        private string displayedVersion = CurrentVersion;
        private bool updateInProgress;

        public MainForm()
        {
            appDir = AppDomain.CurrentDomain.BaseDirectory;
            InitializeComponent();
            RemoveObsoleteFiles();
            CheckRequirements();

            statusTimer = new System.Windows.Forms.Timer();
            statusTimer.Interval = 2500;
            statusTimer.Tick += (s, e) => PollServerStatus();
            statusTimer.Start();
        }

        private void RemoveObsoleteFiles()
        {
            string[] obsoleteFiles = { "Vinttea.bat", "Vinttea.exe.old" };
            foreach (string fileName in obsoleteFiles)
            {
                try
                {
                    string path = Path.Combine(appDir, fileName);
                    if (File.Exists(path)) File.Delete(path);
                }
                catch { }
            }
        }

        private void InitializeComponent()
        {
            this.Text = "Vinttea - Control Remoto para PC";
            this.Size = new Size(640, 765);
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = BgDark;
            this.ForeColor = TextPrimary;
            this.Font = new Font("Segoe UI", 9.25f, FontStyle.Regular);

            // Try load icon
            string iconPath = Path.Combine(appDir, "Vinttea.ico");
            if (File.Exists(iconPath))
            {
                try { this.Icon = new Icon(iconPath); } catch { }
            }

            // System Tray Menu & Icon
            trayMenu = new ContextMenuStrip();
            trayMenu.Items.Add("Abrir Panel de Control", null, (s, e) => RestoreFromTray());
            trayMenu.Items.Add("Iniciar Servidor", null, (s, e) => StartServer());
            trayMenu.Items.Add("Detener Servidor", null, (s, e) => StopServer());
            trayMenu.Items.Add("Abrir Control Web", null, (s, e) => OpenWebRemote());
            trayMenu.Items.Add("-");
            trayMenu.Items.Add("Salir de Vinttea", null, (s, e) => ExitApplication());

            trayIcon = new NotifyIcon();
            trayIcon.Text = "Vinttea - Control Remoto";
            trayIcon.Icon = this.Icon ?? SystemIcons.Application;
            trayIcon.ContextMenuStrip = trayMenu;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => RestoreFromTray();

            this.Resize += (s, e) =>
            {
                if (this.WindowState == FormWindowState.Minimized)
                {
                    this.Hide();
                    trayIcon.ShowBalloonTip(1800, "Vinttea", "El servidor sigue funcionando en segundo plano.", ToolTipIcon.Info);
                }
            };

            // Main Layout Container
            Panel mainContainer = new Panel();
            mainContainer.Dock = DockStyle.Fill;
            mainContainer.Padding = new Padding(16, 12, 16, 12);
            mainContainer.AutoScroll = true;
            this.Controls.Add(mainContainer);

            // 1. Header Panel
            headerPanel = new Panel();
            headerPanel.Size = new Size(590, 68);
            headerPanel.Location = new Point(16, 8);
            headerPanel.Paint += HeaderPanel_Paint;
            mainContainer.Controls.Add(headerPanel);

            // 2. Requirements Diagnostic Card
            reqCard = CreateCardPanel(16, 82, 590, 142);
            mainContainer.Controls.Add(reqCard);

            Label lblReqTitle = new Label();
            lblReqTitle.Text = "DIAGNÓSTICO DEL SISTEMA";
            lblReqTitle.Font = new Font("Segoe UI", 8f, FontStyle.Bold);
            lblReqTitle.ForeColor = AccentIndigo;
            lblReqTitle.Location = new Point(14, 10);
            lblReqTitle.AutoSize = true;
            reqCard.Controls.Add(lblReqTitle);

            lblNodeStatus = new Label { Location = new Point(16, 32), AutoSize = true, ForeColor = TextMuted, Text = "Node.js: Verificando..." };
            lblPnpmStatus = new Label { Location = new Point(16, 54), AutoSize = true, ForeColor = TextMuted, Text = "pnpm: Verificando..." };
            lblBuildStatus = new Label { Location = new Point(16, 76), AutoSize = true, ForeColor = TextMuted, Text = "Paquetes: Verificando..." };
            reqCard.Controls.Add(lblNodeStatus);
            reqCard.Controls.Add(lblPnpmStatus);
            reqCard.Controls.Add(lblBuildStatus);

            btnFixReqs = CreateButton("⚡ Instalar y Configurar Requisitos", 300, 30, 275, 42, AccentIndigo, Color.White);
            btnFixReqs.Click += (s, e) => FixRequirements();
            reqCard.Controls.Add(btnFixReqs);

            btnCreateShortcut = CreateButton("📌 Crear acceso directo en el Escritorio", 16, 102, 558, 30, Color.FromArgb(32, 38, 58), TextPrimary);
            btnCreateShortcut.Click += (s, e) => CreateDesktopShortcut();
            reqCard.Controls.Add(btnCreateShortcut);

            // 3. Server Control Card
            serverCard = CreateCardPanel(16, 232, 590, 240);
            mainContainer.Controls.Add(serverCard);

            Label lblServerHeader = new Label();
            lblServerHeader.Text = "SERVIDOR DE CONTROL REMOTO";
            lblServerHeader.Font = new Font("Segoe UI", 8f, FontStyle.Bold);
            lblServerHeader.ForeColor = AccentIndigo;
            lblServerHeader.Location = new Point(14, 10);
            lblServerHeader.AutoSize = true;
            serverCard.Controls.Add(lblServerHeader);

            lblServerBadge = new Label();
            lblServerBadge.Text = "● SERVIDOR DETENIDO";
            lblServerBadge.Font = new Font("Segoe UI", 11f, FontStyle.Bold);
            lblServerBadge.ForeColor = AccentRed;
            lblServerBadge.Location = new Point(14, 30);
            lblServerBadge.AutoSize = true;
            serverCard.Controls.Add(lblServerBadge);

            lblLocalUrl = new Label { Location = new Point(16, 58), AutoSize = true, ForeColor = TextMuted, Text = "PC Local: http://localhost:9876" };
            lblNetworkUrl = new Label { Location = new Point(16, 78), AutoSize = true, ForeColor = TextMuted, Text = "Celular (WiFi): http://127.0.0.1:9876" };
            lblClientsInfo = new Label { Location = new Point(16, 98), AutoSize = true, ForeColor = TextMuted, Text = "Clientes: Esperando conexión..." };
            serverCard.Controls.Add(lblLocalUrl);
            serverCard.Controls.Add(lblNetworkUrl);
            serverCard.Controls.Add(lblClientsInfo);

            btnStartStopServer = CreateButton("▶ INICIAR SERVIDOR", 16, 126, 272, 44, AccentGreen, Color.White);
            btnStartStopServer.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
            btnStartStopServer.Click += (s, e) => ToggleServer();
            serverCard.Controls.Add(btnStartStopServer);

            btnOpenBrowser = CreateButton("🌐 Abrir Control Web", 300, 126, 274, 44, Color.FromArgb(32, 38, 58), TextPrimary);
            btnOpenBrowser.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            btnOpenBrowser.Click += (s, e) => OpenWebRemote();
            serverCard.Controls.Add(btnOpenBrowser);

            btnShowQR = CreateButton("📱 Conectar Celular (QR)", 16, 180, 272, 40, Color.FromArgb(32, 38, 58), TextPrimary);
            btnShowQR.Click += (s, e) => ShowQrDialog();
            serverCard.Controls.Add(btnShowQR);

            btnExtensionFolder = CreateButton("🧩 Extensión de Navegador", 300, 180, 274, 40, Color.FromArgb(32, 38, 58), TextPrimary);
            btnExtensionFolder.Click += (s, e) => OpenExtensionSetup();
            serverCard.Controls.Add(btnExtensionFolder);

            // 4. Updates & GitHub Card
            updateCard = CreateCardPanel(16, 480, 590, 105);
            mainContainer.Controls.Add(updateCard);

            Label lblUpdateTitle = new Label();
            lblUpdateTitle.Text = "ACTUALIZACIONES Y GITHUB";
            lblUpdateTitle.Font = new Font("Segoe UI", 8f, FontStyle.Bold);
            lblUpdateTitle.ForeColor = AccentIndigo;
            lblUpdateTitle.Location = new Point(14, 10);
            lblUpdateTitle.AutoSize = true;
            updateCard.Controls.Add(lblUpdateTitle);

            lblUpdateStatus = new Label();
            lblUpdateStatus.Text = string.Format("Versión instalada: v{0} • GitHub: {1}", displayedVersion, GitHubRepo);
            lblUpdateStatus.Location = new Point(16, 32);
            lblUpdateStatus.AutoSize = true;
            lblUpdateStatus.ForeColor = TextMuted;
            updateCard.Controls.Add(lblUpdateStatus);

            lblUpdateProgress = new Label();
            lblUpdateProgress.Location = new Point(16, 54);
            lblUpdateProgress.Size = new Size(558, 16);
            lblUpdateProgress.ForeColor = TextMuted;
            lblUpdateProgress.Visible = false;
            updateCard.Controls.Add(lblUpdateProgress);

            updateProgressBar = new ProgressBar();
            updateProgressBar.Location = new Point(16, 72);
            updateProgressBar.Size = new Size(558, 8);
            updateProgressBar.Visible = false;
            updateCard.Controls.Add(updateProgressBar);

            btnCheckUpdates = CreateButton("🔄 Buscar Actualizaciones", 16, 56, 272, 38, Color.FromArgb(32, 38, 58), AccentIndigo);
            btnCheckUpdates.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            btnCheckUpdates.Click += (s, e) => CheckForUpdates(true);
            updateCard.Controls.Add(btnCheckUpdates);

            btnOpenReleases = CreateButton("📦 Ver Releases en GitHub", 300, 56, 274, 38, Color.FromArgb(32, 38, 58), TextPrimary);
            btnOpenReleases.Font = new Font("Segoe UI", 9f, FontStyle.Regular);
            btnOpenReleases.Click += (s, e) => Process.Start("https://github.com/" + GitHubRepo + "/releases");
            updateCard.Controls.Add(btnOpenReleases);

            // 5. Real-Time Activity Log Box
            txtLog = new TextBox();
            txtLog.Location = new Point(16, 595);
            txtLog.Size = new Size(590, 108);
            txtLog.Multiline = true;
            txtLog.ReadOnly = true;
            txtLog.ScrollBars = ScrollBars.Vertical;
            txtLog.BackColor = Color.FromArgb(10, 12, 18);
            txtLog.ForeColor = Color.FromArgb(160, 174, 192);
            txtLog.Font = new Font("Consolas", 8.5f);
            txtLog.BorderStyle = BorderStyle.FixedSingle;
            mainContainer.Controls.Add(txtLog);

            Log("Panel de control de Vinttea v" + CurrentVersion + " inicializado.");
        }

        private Panel CreateCardPanel(int x, int y, int width, int height)
        {
            Panel p = new Panel();
            p.Location = new Point(x, y);
            p.Size = new Size(width, height);
            p.BackColor = CardBg;
            p.Paint += (s, e) =>
            {
                using (Pen pen = new Pen(CardBorder, 1))
                {
                    e.Graphics.DrawRectangle(pen, 0, 0, p.Width - 1, p.Height - 1);
                }
            };
            return p;
        }

        private Button CreateButton(string text, int x, int y, int width, int height, Color bg, Color fg)
        {
            Button btn = new Button();
            btn.Text = text;
            btn.Location = new Point(x, y);
            btn.Size = new Size(width, height);
            btn.FlatStyle = FlatStyle.Flat;
            btn.FlatAppearance.BorderSize = 0;
            btn.BackColor = bg;
            btn.ForeColor = fg;
            btn.Cursor = Cursors.Hand;
            return btn;
        }

        private void HeaderPanel_Paint(object sender, PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            // Header Logo Text
            using (Font titleFont = new Font("Segoe UI", 20f, FontStyle.Bold))
            using (Brush logoBrush = new SolidBrush(Color.White))
            {
                g.DrawString("Vinttea", titleFont, logoBrush, 0, 4);
            }

            // Subtitle
            using (Font subFont = new Font("Segoe UI", 9f, FontStyle.Regular))
            using (Brush subBrush = new SolidBrush(TextMuted))
            {
                g.DrawString("Control remoto de streaming web para PC", subFont, subBrush, 2, 42);
            }

            // Version Pill Badge
            string verText = "v" + displayedVersion;
            using (Font verFont = new Font("Segoe UI", 8.5f, FontStyle.Bold))
            {
                SizeF sz = g.MeasureString(verText, verFont);
                Rectangle pillRect = new Rectangle(headerPanel.Width - (int)sz.Width - 28, 16, (int)sz.Width + 20, 28);
                using (Brush pillBg = new SolidBrush(Color.FromArgb(32, 38, 58)))
                using (Pen pillPen = new Pen(AccentIndigo, 1))
                using (Brush pillFg = new SolidBrush(AccentIndigo))
                {
                    g.FillRectangle(pillBg, pillRect);
                    g.DrawRectangle(pillPen, pillRect);
                    g.DrawString(verText, verFont, pillFg, pillRect.X + 10, pillRect.Y + 6);
                }
            }
        }

        private void Log(string message)
        {
            if (txtLog.InvokeRequired)
            {
                txtLog.Invoke(new Action<string>(Log), message);
                return;
            }
            string time = DateTime.Now.ToString("HH:mm:ss");
            txtLog.AppendText(string.Format("[{0}] {1}\r\n", time, message));
        }

        // ==========================================
        // 1. REQUISITOS DEL ENTORNO
        // ==========================================
        private bool isNodeInstalled = false;
        private bool isPnpmInstalled = false;
        private bool isProjectBuilt = false;

        private void CheckRequirements()
        {
            string nodePath = FindExecutable("node.exe");
            isNodeInstalled = !string.IsNullOrEmpty(nodePath);

            string pnpmPath = FindExecutable("pnpm.cmd") ?? FindExecutable("pnpm");
            isPnpmInstalled = !string.IsNullOrEmpty(pnpmPath);

            string serverDist = Path.Combine(appDir, @"packages\server\dist\index.cjs");
            isProjectBuilt = File.Exists(serverDist);

            lblNodeStatus.Text = isNodeInstalled ? "✔ Node.js: Instalado y listo" : "❌ Node.js: No detectado en este equipo";
            lblNodeStatus.ForeColor = isNodeInstalled ? AccentGreen : AccentRed;

            lblPnpmStatus.Text = isPnpmInstalled ? "✔ pnpm: Instalado" : "⚠ pnpm: No detectado (se usará npx pnpm)";
            lblPnpmStatus.ForeColor = isPnpmInstalled ? AccentGreen : Color.Orange;

            lblBuildStatus.Text = isProjectBuilt ? "✔ Paquetes de Vinttea: Compilados listos" : "❌ Paquetes de Vinttea: Pendiente de compilar";
            lblBuildStatus.ForeColor = isProjectBuilt ? AccentGreen : AccentRed;

            btnFixReqs.Visible = !(isNodeInstalled && isProjectBuilt);
            btnStartStopServer.Enabled = isNodeInstalled && isProjectBuilt;
        }

        private string FindExecutable(string name)
        {
            // Check PATH environment
            string envPath = Environment.GetEnvironmentVariable("PATH") ?? "";
            string[] dirs = envPath.Split(';');
            foreach (string dir in dirs)
            {
                try
                {
                    string full = Path.Combine(dir.Trim(), name);
                    if (File.Exists(full)) return full;
                }
                catch { }
            }

            // Standard fallback paths for Node.js
            if (name == "node.exe")
            {
                string[] defaults = new string[] {
                    @"C:\Program Files\nodejs\node.exe",
                    @"C:\Program Files (x86)\nodejs\node.exe",
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\node\node.exe")
                };
                foreach (string def in defaults)
                {
                    if (File.Exists(def)) return def;
                }
            }

            return null;
        }

        private void FixRequirements()
        {
            btnFixReqs.Enabled = false;
            ThreadPool.QueueUserWorkItem((state) =>
            {
                try
                {
                    // 1. Install Node.js if missing
                    if (!isNodeInstalled)
                    {
                        Log("Instalando Node.js LTS mediante Windows Package Manager (winget)...");
                        Process p = Process.Start(new ProcessStartInfo
                        {
                            FileName = "winget",
                            Arguments = "install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements",
                            UseShellExecute = true
                        });
                        p.WaitForExit();
                        if (p.ExitCode != 0)
                        {
                            Log("Winget falló. Abriendo página oficial de descarga de Node.js...");
                            Process.Start("https://nodejs.org/en/download");
                        }
                    }

                    // 2. Build Project
                    Log("Instalando dependencias y compilando paquetes de Vinttea...");
                    string cmd = isPnpmInstalled ? "pnpm" : "npx pnpm";
                    Process bp = Process.Start(new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = string.Format("/c cd /d \"{0}\" && {1} -r run build", appDir, cmd),
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    });

                    bp.OutputDataReceived += (s, e) => { if (e.Data != null) Log(e.Data); };
                    bp.ErrorDataReceived += (s, e) => { if (e.Data != null) Log(e.Data); };
                    bp.BeginOutputReadLine();
                    bp.BeginErrorReadLine();
                    bp.WaitForExit();

                    Log("¡Verificación de requisitos completada!");
                    this.Invoke(new Action(() => {
                        CheckRequirements();
                        btnFixReqs.Enabled = true;
                    }));
                }
                catch (Exception ex)
                {
                    Log("Error configurando requisitos: " + ex.Message);
                    this.Invoke(new Action(() => btnFixReqs.Enabled = true));
                }
            });
        }

        private void CreateDesktopShortcut()
        {
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                string shortcutPath = Path.Combine(desktopPath, "Vinttea.lnk");
                string targetExe = Path.Combine(appDir, "Vinttea.exe");
                string iconPath = Path.Combine(appDir, "Vinttea.ico");

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);

                shortcut.TargetPath = targetExe;
                shortcut.WorkingDirectory = appDir;
                shortcut.Description = "Vinttea - Control remoto para PC";
                if (File.Exists(iconPath))
                {
                    shortcut.IconLocation = iconPath + ",0";
                }
                shortcut.Save();

                Log("Acceso directo creado con éxito en tu Escritorio: " + shortcutPath);
                MessageBox.Show("¡Acceso directo de Vinttea creado en tu Escritorio!", "Vinttea", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                Log("Error al crear acceso directo: " + ex.Message);
                MessageBox.Show("No se pudo crear el acceso directo: " + ex.Message, "Vinttea", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        // ==========================================
        // 2. GESTIÓN DEL SERVIDOR FASTIFY + WS
        // ==========================================
        private bool isServerRunning = false;
        private string activeLocalIp = "localhost";

        private void ToggleServer()
        {
            if (isServerRunning)
            {
                StopServer();
            }
            else
            {
                StartServer();
            }
        }

        private void StartServer()
        {
            if (isServerRunning) return;

            string nodePath = FindExecutable("node.exe") ?? "node";
            string serverDist = Path.Combine(appDir, @"packages\server\dist\index.cjs");

            if (!File.Exists(serverDist))
            {
                MessageBox.Show("El servidor no está compilado aún. Haz clic en 'Instalar y Configurar Requisitos'.", "Vinttea", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                serverProcess = new Process();
                serverProcess.StartInfo = new ProcessStartInfo
                {
                    FileName = nodePath,
                    Arguments = string.Format("\"{0}\"", serverDist),
                    WorkingDirectory = appDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                serverProcess.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) Log("[Servidor] " + e.Data); };
                serverProcess.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) Log("[Servidor ERR] " + e.Data); };

                serverProcess.Start();
                serverProcess.BeginOutputReadLine();
                serverProcess.BeginErrorReadLine();

                isServerRunning = true;
                UpdateServerUI(true);
                Log("Iniciando servidor Vinttea...");
            }
            catch (Exception ex)
            {
                Log("Error al iniciar servidor: " + ex.Message);
                MessageBox.Show("Error al iniciar el servidor: " + ex.Message, "Vinttea", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void StopServer()
        {
            if (serverProcess != null && !serverProcess.HasExited)
            {
                try
                {
                    serverProcess.Kill();
                    serverProcess.Dispose();
                }
                catch { }
            }
            serverProcess = null;
            isServerRunning = false;
            UpdateServerUI(false);
            Log("Servidor detenido.");
        }

        private void UpdateServerUI(bool running)
        {
            if (lblServerBadge.InvokeRequired)
            {
                this.Invoke(new Action<bool>(UpdateServerUI), running);
                return;
            }

            if (running)
            {
                lblServerBadge.Text = "● SERVIDOR ACTIVO EN PUERTO 9876";
                lblServerBadge.ForeColor = AccentGreen;
                btnStartStopServer.Text = "⏹ DETENER SERVIDOR";
                btnStartStopServer.BackColor = AccentRed;
            }
            else
            {
                lblServerBadge.Text = "● SERVIDOR DETENIDO";
                lblServerBadge.ForeColor = AccentRed;
                btnStartStopServer.Text = "▶ INICIAR SERVIDOR";
                btnStartStopServer.BackColor = AccentGreen;
                lblClientsInfo.Text = "Clientes: Servidor detenido";
            }
        }

        private void PollServerStatus()
        {
            if (!isServerRunning) return;

            ThreadPool.QueueUserWorkItem((st) =>
            {
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:9876/api/status");
                    req.Timeout = 1500;
                    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                    using (StreamReader rdr = new StreamReader(resp.GetResponseStream()))
                    {
                        string json = rdr.ReadToEnd();

                        // Parse status fields
                        bool extConnected = json.Contains("\"extensionConnected\":true");
                        Match remotesMatch = Regex.Match(json, "\"activeRemotes\":(\\d+)");
                        Match ipMatch = Regex.Match(json, "\"localIp\":\"([^\"]+)\"");

                        string remotes = remotesMatch.Success ? remotesMatch.Groups[1].Value : "0";
                        if (ipMatch.Success) activeLocalIp = ipMatch.Groups[1].Value;

                        this.Invoke(new Action(() =>
                        {
                            lblLocalUrl.Text = "PC Local: http://localhost:9876";
                            lblNetworkUrl.Text = string.Format("Celular (WiFi): http://{0}:9876", activeLocalIp);
                            lblClientsInfo.Text = string.Format("📱 Remotos: {0} conectado(s) | 🧩 Extensión: {1}",
                                remotes, extConnected ? "Conectada ✔" : "Esperando...");
                        }));
                    }
                }
                catch
                {
                    // Server might still be launching
                }
            });
        }

        private void OpenWebRemote()
        {
            if (!isServerRunning) StartServer();
            Process.Start("http://localhost:9876");
        }

        private void ShowQrDialog()
        {
            if (!isServerRunning) StartServer();

            string networkUrl = string.Format("http://{0}:9876", activeLocalIp);

            Form qrForm = new Form();
            qrForm.Text = "Conectar Celular - Vinttea";
            qrForm.Size = new Size(420, 480);
            qrForm.StartPosition = FormStartPosition.CenterParent;
            qrForm.FormBorderStyle = FormBorderStyle.FixedDialog;
            qrForm.MaximizeBox = false;
            qrForm.MinimizeBox = false;
            qrForm.BackColor = BgDark;
            qrForm.ForeColor = TextPrimary;

            Label title = new Label();
            title.Text = "Escanea este código con tu celular";
            title.Font = new Font("Segoe UI", 12f, FontStyle.Bold);
            title.TextAlign = ContentAlignment.MiddleCenter;
            title.Dock = DockStyle.Top;
            title.Height = 40;
            qrForm.Controls.Add(title);

            PictureBox pic = new PictureBox();
            pic.Size = new Size(240, 240);
            pic.Location = new Point(85, 55);
            pic.SizeMode = PictureBoxSizeMode.Zoom;
            pic.BackColor = Color.White;
            qrForm.Controls.Add(pic);

            // Fetch high quality QR from free standard QR API
            string qrApiUrl = string.Format("https://api.qrserver.com/v1/create-qr-code/?size=240x240&data={0}", Uri.EscapeDataString(networkUrl));
            ThreadPool.QueueUserWorkItem((st) =>
            {
                try
                {
                    using (WebClient wc = new WebClient())
                    {
                        byte[] bytes = wc.DownloadData(qrApiUrl);
                        using (MemoryStream ms = new MemoryStream(bytes))
                        {
                            Image img = Image.FromStream(ms);
                            pic.Invoke(new Action(() => pic.Image = (Image)img.Clone()));
                        }
                    }
                }
                catch { }
            });

            Label urlLabel = new Label();
            urlLabel.Text = string.Format("O ingresa en tu navegador móvil:\n{0}", networkUrl);
            urlLabel.Font = new Font("Segoe UI", 10f, FontStyle.Regular);
            urlLabel.ForeColor = AccentIndigo;
            urlLabel.TextAlign = ContentAlignment.MiddleCenter;
            urlLabel.Location = new Point(20, 310);
            urlLabel.Size = new Size(370, 50);
            qrForm.Controls.Add(urlLabel);

            Button btnCopy = CreateButton("Copiar Enlace", 125, 375, 160, 38, Color.FromArgb(32, 38, 58), TextPrimary);
            btnCopy.Click += (s, e) => { Clipboard.SetText(networkUrl); MessageBox.Show("¡Enlace copiado al portapapeles!"); };
            qrForm.Controls.Add(btnCopy);

            qrForm.ShowDialog(this);
        }

        private void OpenExtensionSetup()
        {
            string extDir = Path.Combine(appDir, @"packages\extension\.output\chrome-mv3");
            if (!Directory.Exists(extDir))
            {
                extDir = Path.Combine(appDir, @"packages\extension");
            }

            Process.Start("explorer.exe", extDir);

            MessageBox.Show(
                "Para instalar la extensión en Google Chrome o Microsoft Edge:\n\n" +
                "1. Abre en tu navegador: chrome://extensions o edge://extensions\n" +
                "2. Activa la casilla 'Modo de desarrollador' arriba a la derecha.\n" +
                "3. Haz clic en 'Cargar descomprimida' (Load unpacked).\n" +
                "4. Selecciona la carpeta que se acaba de abrir en el explorador:\n" +
                extDir,
                "Cómo instalar la Extensión Vinttea",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );
        }

        // ==========================================
        // 3. ACTUALIZACIONES DESDE GITHUB RELEASES
        // ==========================================
        private void SetUpdatePanelExpanded(bool expanded)
        {
            if (InvokeRequired)
            {
                Invoke(new Action<bool>(SetUpdatePanelExpanded), expanded);
                return;
            }

            if (expanded)
            {
                updateCard.Height = 154;
                lblUpdateProgress.Location = new Point(16, 54);
                lblUpdateProgress.Size = new Size(558, 20);
                updateProgressBar.Location = new Point(16, 82);
                updateProgressBar.Size = new Size(558, 14);
                btnCheckUpdates.Location = new Point(16, 106);
                btnOpenReleases.Location = new Point(300, 106);
                txtLog.Location = new Point(16, 644);
                txtLog.Size = new Size(590, 90);
                return;
            }

            updateCard.Height = 105;
            lblUpdateProgress.Visible = false;
            updateProgressBar.Visible = false;
            updateProgressBar.Style = ProgressBarStyle.Continuous;
            updateProgressBar.Value = 0;
            btnCheckUpdates.Location = new Point(16, 56);
            btnOpenReleases.Location = new Point(300, 56);
            txtLog.Location = new Point(16, 595);
            txtLog.Size = new Size(590, 108);
        }

        private void CheckForUpdates(bool isManual)
        {
            btnCheckUpdates.Enabled = false;
            btnCheckUpdates.Text = "Buscando...";
            SetUpdatePanelExpanded(true);
            ReportUpdateProgress("Buscando actualizaciones...", -1);
            Log("Consultando releases en GitHub: " + GitHubRepo + "...");

            ThreadPool.QueueUserWorkItem((st) =>
            {
                try
                {
                    string apiUrl = string.Format("https://api.github.com/repos/{0}/releases/latest", GitHubRepo);
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create(apiUrl);
                    req.UserAgent = "Vinttea-Launcher";
                    req.Timeout = 8000;

                    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                    using (StreamReader rdr = new StreamReader(resp.GetResponseStream()))
                    {
                        string json = rdr.ReadToEnd();

                        Match tagMatch = Regex.Match(json, "\"tag_name\":\"([^\"]+)\"");
                        Match nameMatch = Regex.Match(json, "\"name\":\"([^\"]+)\"");
                        Match bodyMatch = Regex.Match(json, "\"body\":\"([^\"]+)\"");
                        Match zipMatch = Regex.Match(json, "\"browser_download_url\":\"([^\"]+\\.zip)\"");

                        if (!tagMatch.Success)
                        {
                            this.Invoke(new Action(() => {
                                Log("No se encontraron releases publicadas aún en GitHub.");
                                if (isManual) MessageBox.Show("No se encontraron versiones publicadas en GitHub.", "Vinttea", MessageBoxButtons.OK, MessageBoxIcon.Information);
                                ResetUpdateBtn();
                                SetUpdatePanelExpanded(false);
                            }));
                            return;
                        }

                        string remoteTag = tagMatch.Groups[1].Value.TrimStart('v', 'V');
                        string releaseName = nameMatch.Success ? nameMatch.Groups[1].Value : remoteTag;
                        string releaseBody = bodyMatch.Success ? Regex.Unescape(bodyMatch.Groups[1].Value) : "Mejoras y correcciones.";
                        string downloadUrl = zipMatch.Success ? zipMatch.Groups[1].Value : null;

                        Version currentVer = new Version(displayedVersion);
                        Version remoteVer = new Version(remoteTag);

                        if (remoteVer > currentVer)
                        {
                            this.Invoke(new Action(() =>
                            {
                                Log("¡Nueva versión disponible en GitHub: v" + remoteTag + "!");
                                DialogResult dr = MessageBox.Show(
                                    string.Format("¡Nueva actualización disponible: v{0}!\n\n{1}\n\n¿Deseas descargar e instalar la actualización ahora?", remoteTag, releaseBody),
                                    "Actualización de Vinttea",
                                    MessageBoxButtons.YesNo,
                                    MessageBoxIcon.Information
                                );

                                if (dr == DialogResult.Yes && !string.IsNullOrEmpty(downloadUrl))
                                {
                                    InstallUpdate(downloadUrl, remoteTag);
                                }
                                else
                                {
                                    if (dr == DialogResult.Yes)
                                    {
                                        MessageBox.Show("La release no tiene un archivo de actualización descargable.", "Actualización de Vinttea", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                                    }
                                    ResetUpdateBtn();
                                    SetUpdatePanelExpanded(false);
                                }
                            }));
                        }
                        else
                        {
                            this.Invoke(new Action(() =>
                            {
                                Log("Vinttea ya está actualizado en la versión más reciente (v" + displayedVersion + ").");
                                if (isManual) MessageBox.Show("Vinttea ya está en la versión más reciente (v" + displayedVersion + ").", "Vinttea", MessageBoxButtons.OK, MessageBoxIcon.Information);
                                ResetUpdateBtn();
                                SetUpdatePanelExpanded(false);
                            }));
                        }
                    }
                }
                catch (Exception ex)
                {
                    this.Invoke(new Action(() =>
                    {
                        Log("No se pudo verificar actualizaciones: " + ex.Message);
                        if (isManual) MessageBox.Show("No se pudo conectar con GitHub: " + ex.Message, "Vinttea", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        ResetUpdateBtn();
                        SetUpdatePanelExpanded(false);
                    }));
                }
            });
        }

        private void ResetUpdateBtn()
        {
            if (btnCheckUpdates.InvokeRequired)
            {
                btnCheckUpdates.Invoke(new Action(ResetUpdateBtn));
                return;
            }
            btnCheckUpdates.Enabled = true;
            btnCheckUpdates.Text = "🔄 Buscar Actualizaciones";
        }

        private void ReportUpdateProgress(string message, int percent)
        {
            if (IsDisposed || !IsHandleCreated) return;
            if (InvokeRequired)
            {
                BeginInvoke(new Action<string, int>(ReportUpdateProgress), message, percent);
                return;
            }

            lblUpdateProgress.Text = message;
            lblUpdateProgress.Visible = true;
            updateProgressBar.Visible = true;
            if (percent < 0)
            {
                updateProgressBar.Style = ProgressBarStyle.Marquee;
            }
            else
            {
                updateProgressBar.Style = ProgressBarStyle.Continuous;
                updateProgressBar.Value = Math.Max(0, Math.Min(100, percent));
            }
        }

        private void SetDisplayedVersion(string version)
        {
            if (InvokeRequired)
            {
                Invoke(new Action<string>(SetDisplayedVersion), version);
                return;
            }

            displayedVersion = version;
            lblUpdateStatus.Text = string.Format("Versión instalada: v{0} • GitHub: {1}", displayedVersion, GitHubRepo);
            headerPanel.Invalidate();
        }

        private bool AskRestartNow(string version)
        {
            using (Form prompt = new Form())
            using (Label message = new Label())
            using (Button restartButton = new Button())
            using (Button laterButton = new Button())
            {
                prompt.Text = "Actualización lista";
                prompt.Size = new Size(430, 190);
                prompt.FormBorderStyle = FormBorderStyle.FixedDialog;
                prompt.StartPosition = FormStartPosition.CenterParent;
                prompt.MaximizeBox = false;
                prompt.MinimizeBox = false;
                prompt.BackColor = BgDark;
                prompt.ForeColor = TextPrimary;
                prompt.Font = new Font("Segoe UI", 9.25f, FontStyle.Regular);

                message.Text = string.Format(
                    "Vinttea se actualizó a la versión v{0}.\n¿Querés reiniciar ahora para ver los cambios?",
                    version
                );
                message.Location = new Point(20, 20);
                message.Size = new Size(374, 55);
                message.ForeColor = TextPrimary;

                restartButton.Text = "Sí, reiniciar";
                restartButton.DialogResult = DialogResult.Yes;
                restartButton.Location = new Point(154, 100);
                restartButton.Size = new Size(116, 34);
                restartButton.BackColor = AccentGreen;
                restartButton.ForeColor = Color.White;
                restartButton.FlatStyle = FlatStyle.Flat;

                laterButton.Text = "Después";
                laterButton.DialogResult = DialogResult.No;
                laterButton.Location = new Point(278, 100);
                laterButton.Size = new Size(116, 34);
                laterButton.BackColor = Color.FromArgb(32, 38, 58);
                laterButton.ForeColor = TextPrimary;
                laterButton.FlatStyle = FlatStyle.Flat;

                prompt.Controls.Add(message);
                prompt.Controls.Add(restartButton);
                prompt.Controls.Add(laterButton);
                prompt.AcceptButton = restartButton;
                prompt.CancelButton = laterButton;
                return prompt.ShowDialog(this) == DialogResult.Yes;
            }
        }

        private void InstallUpdate(string downloadUrl, string newVersion)
        {
            updateInProgress = true;
            SetUpdatePanelExpanded(true);
            btnCheckUpdates.Enabled = false;
            btnCheckUpdates.Text = "Actualizando...";
            ReportUpdateProgress("Preparando la descarga...", 0);
            Log("Descargando actualización v" + newVersion + "...");
            ThreadPool.QueueUserWorkItem((st) =>
            {
                try
                {
                    string tempZip = Path.Combine(Path.GetTempPath(), "vinttea-update-" + newVersion + ".zip");
                    string extractDir = Path.Combine(Path.GetTempPath(), "vinttea-update-extracted-" + newVersion);

                    DownloadUpdateWithProgress(downloadUrl, tempZip);

                    ReportUpdateProgress("Extrayendo la actualización...", -1);
                    Log("Extrayendo archivos de la actualización...");
                    if (Directory.Exists(extractDir)) Directory.Delete(extractDir, true);
                    ZipFile.ExtractToDirectory(tempZip, extractDir);

                    // If GitHub zipball, find root folder inside
                    string sourceDir = extractDir;
                    string[] subDirs = Directory.GetDirectories(extractDir);
                    if (subDirs.Length == 1 && !Directory.Exists(Path.Combine(extractDir, "packages")))
                    {
                        sourceDir = subDirs[0];
                    }

                    UpdatePackageVersions(sourceDir, newVersion);

                    // Stop server before overwriting
                    StopServer();

                    ReportUpdateProgress("Instalando archivos...", -1);
                    Log("Reemplazando y agregando archivos actualizados...");
                    CopyDirectory(sourceDir, appDir);

                    Log("¡Actualización completada exitosamente a v" + newVersion + "!");
                    ReportUpdateProgress("Actualización completada.", 100);
                    SetDisplayedVersion(newVersion);
                    bool restartNow = (bool)Invoke(new Func<bool>(() => AskRestartNow(newVersion)));
                    if (restartNow)
                    {
                        updateInProgress = false;
                        Invoke(new Action(() => Application.Restart()));
                        return;
                    }

                    Log("Reinicio pospuesto; los cambios se aplicarán al volver a abrir Vinttea.");
                    ReportUpdateProgress("Listo. Reiniciá Vinttea cuando quieras aplicar los cambios.", 100);
                    updateInProgress = false;
                    Invoke(new Action(ResetUpdateBtn));
                    Invoke(new Action(() => SetUpdatePanelExpanded(false)));
                }
                catch (Exception ex)
                {
                    Log("Error durante la actualización: " + ex.Message);
                    updateInProgress = false;
                    if (!IsDisposed && IsHandleCreated)
                    {
                        Invoke(new Action(() =>
                        {
                            updateProgressBar.Visible = false;
                            lblUpdateProgress.Visible = false;
                            ResetUpdateBtn();
                            SetUpdatePanelExpanded(false);
                            MessageBox.Show("Hubo un error al aplicar la actualización: " + ex.Message, "Vinttea", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        }));
                    }
                }
            });
        }

        private void DownloadUpdateWithProgress(string downloadUrl, string destinationPath)
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(downloadUrl);
            request.UserAgent = "Vinttea-Launcher";
            request.Timeout = 30000;

            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            using (Stream input = response.GetResponseStream())
            using (FileStream output = new FileStream(destinationPath, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                long totalBytes = response.ContentLength;
                long downloadedBytes = 0;
                byte[] buffer = new byte[64 * 1024];
                int bytesRead;

                while ((bytesRead = input.Read(buffer, 0, buffer.Length)) > 0)
                {
                    output.Write(buffer, 0, bytesRead);
                    downloadedBytes += bytesRead;
                    int percent = totalBytes > 0
                        ? (int)Math.Min(60, downloadedBytes * 60L / totalBytes)
                        : -1;
                    string status = totalBytes > 0
                        ? string.Format("Descargando... {0}%", (int)(downloadedBytes * 100L / totalBytes))
                        : "Descargando la actualización...";
                    ReportUpdateProgress(status, percent);
                }
            }
        }

        private void UpdatePackageVersions(string packageRoot, string version)
        {
            string[] manifestPaths = new string[]
            {
                Path.Combine(packageRoot, "package.json"),
                Path.Combine(packageRoot, "packages", "server", "package.json"),
                Path.Combine(packageRoot, "packages", "remote", "package.json"),
                Path.Combine(packageRoot, "packages", "shared", "package.json"),
                Path.Combine(packageRoot, "packages", "extension", "package.json")
            };
            Regex versionPattern = new Regex("(?m)^(\\s*\\\"version\\\"\\s*:\\s*\\\")[^\\\"]+(\\\"\\s*,?)");

            foreach (string manifestPath in manifestPaths)
            {
                if (!File.Exists(manifestPath))
                {
                    throw new FileNotFoundException("Falta un manifiesto de versión en el paquete descargado.", manifestPath);
                }

                string manifest = File.ReadAllText(manifestPath);
                if (!versionPattern.IsMatch(manifest))
                {
                    throw new InvalidDataException("No se encontró la versión en " + Path.GetFileName(manifestPath) + ".");
                }

                string updatedManifest = versionPattern.Replace(
                    manifest,
                    delegate(Match match)
                    {
                        return match.Groups[1].Value + version + match.Groups[2].Value;
                    },
                    1
                );
                File.WriteAllText(manifestPath, updatedManifest, new UTF8Encoding(false));
            }
        }

        private void CopyDirectory(string sourceDir, string destDir)
        {
            Directory.CreateDirectory(destDir);
            foreach (string file in Directory.GetFiles(sourceDir))
            {
                string fileName = Path.GetFileName(file);
                // Don't overwrite the active launcher executable directly if locked
                if (fileName.Equals("Vinttea.exe", StringComparison.OrdinalIgnoreCase))
                {
                    string oldExe = Path.Combine(destDir, "Vinttea.exe.old");
                    try { if (File.Exists(oldExe)) File.Delete(oldExe); } catch { }
                    try { File.Move(Path.Combine(destDir, "Vinttea.exe"), oldExe); } catch { }
                }

                string destFile = Path.Combine(destDir, fileName);
                File.Copy(file, destFile, true);
            }

            foreach (string dir in Directory.GetDirectories(sourceDir))
            {
                string dirName = Path.GetFileName(dir);
                if (dirName.Equals(".git", StringComparison.OrdinalIgnoreCase) ||
                    dirName.Equals("node_modules", StringComparison.OrdinalIgnoreCase))
                {
                    continue; // Skip .git and node_modules
                }
                CopyDirectory(dir, Path.Combine(destDir, dirName));
            }
        }

        private void RestoreFromTray()
        {
            this.Show();
            this.WindowState = FormWindowState.Normal;
            this.BringToFront();
        }

        private void ExitApplication()
        {
            StopServer();
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }
            Application.Exit();
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (updateInProgress)
            {
                e.Cancel = true;
                MessageBox.Show(
                    "Esperá a que termine la actualización antes de cerrar Vinttea.",
                    "Actualización en curso",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
                return;
            }

            ExitApplication();
            base.OnFormClosing(e);
        }
    }
}
