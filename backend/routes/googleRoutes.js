const router = require('express').Router();
const c = require('../controllers/googleController');
router.use(require('../middlewares/adminMiddleware').isAdmin);
router.get('/', c.status);
router.post('/:purpose/connect', c.connect);
router.delete('/:purpose', c.disconnect);
router.post('/sheets/picker-token', c.pickerToken);
router.get('/sheets/:spreadsheetId/tabs', c.sheetTabs);
module.exports = router;
