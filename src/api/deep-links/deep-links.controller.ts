import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('DeepLinks')
@Controller()
export class DeepLinksController {
  // iOS Universal Links
  @Get('.well-known/apple-app-site-association')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'iOS Universal Links association file' })
  @ApiOkResponse({ description: 'apple-app-site-association JSON' })
  appleAppSiteAssociation() {
    const teamId = process.env.IOS_TEAM_ID || 'TEAMID';
    const bundleId = process.env.IOS_BUNDLE_ID || 'app';

    return {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: [`${teamId}.${bundleId}`],
            components: [
              { '/': '/welcome/*' }, // iOS 16+ components format
            ],
            paths: ['/welcome/*'], // compat legacy
          },
        ],
      },
    };
  }

  // Android App Links
  @Get('.well-known/assetlinks.json')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'Android App Links association file' })
  @ApiOkResponse({ description: 'assetlinks.json JSON array' })
  assetLinks() {
    const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.therun.app';
    const sha256 =
      process.env.ANDROID_SHA256_CERT_FINGERPRINT ||
      '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00';

    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: [sha256],
        },
      },
    ];
  }

  // Trampoline QR
  @Get('welcome/:eventCode')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'QR join trampoline: deep link + fallback web' })
  @ApiParam({ name: 'eventCode', required: true })
  @ApiOkResponse({ description: 'HTML trampoline page' })
  joinTrampoline(@Param('eventCode') eventCode: string) {
    const deepLink = `therun://event/${encodeURIComponent(eventCode)}`;
    const fallback = `/public/join/${encodeURIComponent(eventCode)}?source=qr`;

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>The Run – Rejoindre</title>
</head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; padding:16px;">
  <h1 style="margin:0 0 8px 0;">The Run</h1>
  <p style="margin:0 0 16px 0;">Ouverture de l’événement <b>${escapeHtml(eventCode)}</b>…</p>

  <p style="margin:0 0 16px 0;">
    <a href="${deepLink}">Ouvrir dans l’app</a>
    &nbsp;•&nbsp;
    <a href="${fallback}">Continuer sur le web</a>
  </p>

  <script>
    (function () {
      var deep = ${JSON.stringify(deepLink)};
      var fallback = ${JSON.stringify(fallback)};
      // tentative d'ouverture de l'app
      window.location.href = deep;
      // fallback si l'app n'est pas installée (ou si le deep link échoue)
      setTimeout(function () { window.location.href = fallback; }, 700);
    })();
  </script>
</body>
</html>`;

    function escapeHtml(s: string) {
      return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }
  }
}
