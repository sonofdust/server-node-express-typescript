import crypto from 'crypto';
import { AddressType } from '../types/address.types';
export const createHash = (data: string): string => {
    return crypto
        .createHash('sha256')
        .update(data)
        .digest('hex');
};

export const createAddressHash = (address: AddressType): string => {
    const hashString = `${address.country_id || ''}${address.city || ''}${address.state || ''}${address.zip_code || ''}`.toLowerCase();
    return crypto.createHash('md5').update(hashString).digest('hex');
};

export const createUserHash = (email: string): string => {
    return createHash(email.toLowerCase());
};