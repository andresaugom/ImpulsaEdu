
import { Router } from 'express';
import { syncExcelToDB } from '../functions/sync-xslx-to-db';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/sync', upload.single('excel-file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const result = await syncExcelToDB(req.file.path);
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error syncing data.');
    }
});

export default router;
