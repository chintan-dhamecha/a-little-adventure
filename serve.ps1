# Tiny local static file server — no install needed, uses built-in .NET.
# Lets you test the game properly instead of double-clicking index.html
# (opening a page directly as a file:// URL can silently break scripts in
# some browsers, with no visible error).
#
# Usage: double-click "Start Game.bat" in this same folder, or run:
#   powershell -ExecutionPolicy Bypass -File serve.ps1
#
param(
  [int]$Port = 8787
)

$Root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
  $listener.Start()
} catch {
  Write-Host "Could not start on port $Port — it may already be in use."
  Write-Host "Close any other running copy of this server and try again."
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Host "Birthday game running at http://localhost:$Port/"
Write-Host "Leave this window open while you're testing. Press Ctrl+C to stop."

try { Start-Process "http://localhost:$Port/index.html" } catch {
  Write-Host "Couldn't auto-open a browser — just open this link yourself:"
  Write-Host "http://localhost:$Port/index.html"
}

$mime = @{
  ".html" = "text/html"
  ".js"   = "application/javascript"
  ".css"  = "text/css"
  ".svg"  = "image/svg+xml"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".png"  = "image/png"
  ".json" = "application/json"
  ".md"   = "text/markdown"
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  $res.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate")
  try {
    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
    if ($path -eq "/") { $path = "/index.html" }
    $full = Join-Path $Root ($path.TrimStart('/'))
    $full = [System.IO.Path]::GetFullPath($full)
    if (-not $full.StartsWith([System.IO.Path]::GetFullPath($Root))) {
      $res.StatusCode = 403
      $res.Close()
      continue
    }
    if (Test-Path $full -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ct = $mime[$ext]
      if (-not $ct) { $ct = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $res.ContentType = $ct
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $path")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
    $res.StatusCode = 500
  } finally {
    $res.Close()
  }
}
