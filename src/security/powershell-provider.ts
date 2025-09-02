import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { PromptProvider, PromptResult } from '../types';
import { loggers } from '../logging/logger';
import { Console } from 'console';

const SCRIPT_DIR = path.join(process.cwd(), 'scripts');
const SCRIPT_PATH = path.join(SCRIPT_DIR, 'security-prompt.ps1');

const PS_CONTENT = `#requires -Version 3
Param(
  [Parameter(Mandatory=$true)][string]$HostName,
  [Parameter(Mandatory=$true)][string]$ActionName
)

try {
  Add-Type -AssemblyName PresentationFramework -ErrorAction Stop
} catch {
  Write-Output "deny-once"
  exit 0
}

# Create window (STA assumed; ensure caller uses -STA)
$Window = New-Object System.Windows.Window
$Window.Title = "Printer Proxy Security Prompt"
$Window.Width = 440
$Window.Height = 230
$Window.WindowStartupLocation = "CenterScreen"
$Window.Topmost = $true
$Window.ResizeMode = "NoResize"
$Window.Background = "WhiteSmoke"
$Window.Foreground = "Black"
$Window.FontFamily = "Segoe UI"

$Grid = New-Object System.Windows.Controls.Grid
$Grid.Margin = "14"

# Rows
0..3 | ForEach-Object { $Grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition)) }
$Grid.RowDefinitions[0].Height = "Auto"
$Grid.RowDefinitions[1].Height = "Auto"
$Grid.RowDefinitions[2].Height = "Auto"
$Grid.RowDefinitions[3].Height = "Auto"

# Text
$TextBlock = New-Object System.Windows.Controls.TextBlock
$TextBlock.TextWrapping = 'Wrap'
$TextBlock.FontSize = 15
$TextBlock.Margin = "0,0,0,10"
$TextBlock.Text = "$HostName is attempting action: $ActionName.\nChoose how to proceed:"
$Grid.Children.Add($TextBlock)

# Buttons
$ButtonPanel = New-Object System.Windows.Controls.WrapPanel
$ButtonPanel.HorizontalAlignment = "Center"
$ButtonPanel.Margin = "0,8,0,0"
[System.Windows.Controls.Grid]::SetRow($ButtonPanel,1)

function MakeButton($label, $tag) {
  $b = New-Object System.Windows.Controls.Button
  $b.Content = $label
  $b.Margin = "4"
  $b.Padding = "10,6"
  $b.Tag = $tag
  $b.MinWidth = 90
  $b.Add_Click({
    $Window.Tag = $_.Source.Tag
    $Window.Close()
  })
  return $b
}

$ButtonPanel.Children.Add( (MakeButton "Allow Once" "allow-once") )
$ButtonPanel.Children.Add( (MakeButton "Deny Once" "deny-once") )
$ButtonPanel.Children.Add( (MakeButton "Whitelist" "whitelist") )
$ButtonPanel.Children.Add( (MakeButton "Blacklist" "blacklist") )
$Grid.Children.Add($ButtonPanel)

$Footer = New-Object System.Windows.Controls.TextBlock
$Footer.FontSize = 11
$Footer.Margin = "0,14,0,0"
$Footer.Opacity = 0.7
$Footer.Text = "Close or timeout defaults to Deny Once (30s)."
[System.Windows.Controls.Grid]::SetRow($Footer,2)
$Grid.Children.Add($Footer)

$Window.Content = $Grid

# Timer for timeout (30s)
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds(30)
$timer.Add_Tick({
  if (-not $Window.Tag) {
    $Window.Tag = "deny-once"
    $Window.Close()
  }
  $timer.Stop()
})
$timer.Start()

$null = $Window.ShowDialog()

$decision = $Window.Tag
if (-not $decision) { $decision = "deny-once" }

Write-Output $decision
`;

function ensureScript(): void {
  if (!fs.existsSync(SCRIPT_DIR)) {
    fs.mkdirSync(SCRIPT_DIR, { recursive: true });
  }

  const current = fs.existsSync(SCRIPT_PATH) ? fs.readFileSync(SCRIPT_PATH, 'utf8') : '';

  if (current.trim() !== PS_CONTENT.trim()) {
    fs.writeFileSync(SCRIPT_PATH, PS_CONTENT, 'utf8');
  }
}

export class PowerShellPromptProvider implements PromptProvider {
  constructor() {
    ensureScript();
  }

  prompt(host: string, action: string): Promise<PromptResult> {
    return new Promise((resolve) => {
      const args = [
        '-NoLogo',
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-STA',
        '-File', SCRIPT_PATH,
        '-HostName', host,
        '-ActionName', action
      ];

      loggers.security.debug('SecurityPromptSpawn', { args });

      const ps = spawn('powershell.exe', args, {
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';
      let finished = false;

      const timeout = setTimeout(() => {
        if (finished) {
          return;
        }

        finished = true;
        ps.kill();

        loggers.security.warn('SecurityPromptTimeout', { host, action });
        resolve({ decision: 'timeout', host, action });
      }, 32000);

      ps.stdout.on('data', d => { stdout += d.toString('utf8'); });
      ps.stderr.on('data', d => { stderr += d.toString('utf8'); });

      const finalize = (why: string) => {
        if (finished) {
          return;
        }

        finished = true;
        clearTimeout(timeout);

        const decisionRaw = (stdout || '').trim();

        loggers.security.info('SecurityPromptRaw', {
          host,
          action,
          reason: why,
          stdout: decisionRaw,
          stderr: stderr.trim()
        });

        const valid = ['allow-once', 'deny-once', 'whitelist', 'blacklist'];
        const match = decisionRaw.match(new RegExp(valid.join('|')));
        const normalized = match ? match[0] as PromptResult['decision'] : 'deny-once';

        resolve({ decision: normalized, host, action });
      };

      ps.on('error', err => {
        loggers.security.error('SecurityPromptProcError', { host, action, error: err.message });
        finalize('proc-error');
      });

      ps.on('close', () => finalize('close'));
    });
  }
}