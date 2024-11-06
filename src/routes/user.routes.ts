import express, { Request, Response } from 'express';
import dbService from '../db/db.service';
import { createAddressHash, createUserHash } from '../utils/hash';

const router = express.Router();



router.post('/user', async (req: Request, res: Response) => {
    try {
        const { first_name, last_name, email, country_id, city, state, zip_code } = req.body;
const address_key = createAddressHash({ country_id, city, state, zip_code });
const user_key = createUserHash(email);



 // Create address_tbl and get address_key
        const address_tbl = await dbService.createAddress({
            country_id,
            city,
            state,
            zip_code,
            address_key
        });
//        res.status(201).json({ address_key, user_key });

        // Create user with address_key
        const user = await dbService.createUser({
            first_name,
            last_name,
            email,
            user_key
        });

 const user_address_link_tbl = await dbService.createUserAddressLink(user_key, address_key);

       res.status(201).json({ user, address_tbl, user_address_link_tbl });
    } catch (error: unknown) {
        console.error('Error creating user:', error);
        if (error instanceof Error && error.message === 'Email already exists') {
            res.status(409).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: 'Error creating user' });
        }
    }
});
router.delete('/user', async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await dbService.deleteUserAddressByEmail(email);
    res.status(200).json(result);
});

router.get('/user', async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await dbService.getUserAddress(email);
    res.status(200).json(result);
});

router.put('/user', async (req: Request, res: Response) => {
    const { email, first_name, last_name } = req.body;
    const result = await dbService.updateUser(email, first_name, last_name);
    res.status(200).json(result);
});

export default router;  // Add this line at the end of the file