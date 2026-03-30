const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

app.get('/api/docs.json', (req, res) => {
	res.status(200).json(swaggerSpec);
});

app.get(['/api/docs', '/api/docs/'], (req, res) => {
	res.status(200).send(`<!doctype html>
<html lang="pt">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>KudiaMap API Docs</title>
		<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
		<style>
			html, body { margin: 0; padding: 0; }
			#swagger-ui { min-height: 100vh; }
		</style>
	</head>
	<body>
		<div id="swagger-ui"></div>
		<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
		<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
		<script>
			window.onload = function () {
				SwaggerUIBundle({
					url: '/api/docs.json',
					dom_id: '#swagger-ui',
					presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
					layout: 'StandaloneLayout',
					deepLinking: true,
				});
			};
		</script>
	</body>
</html>`);
});

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;