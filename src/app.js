const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

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

app.use(
	'/api/docs',
	swaggerUi.serve,
	swaggerUi.setup(null, {
		swaggerOptions: {
			url: '/api/docs.json',
		},
	})
);
app.use('/api', routes);

app.use(errorHandler);

module.exports = app;