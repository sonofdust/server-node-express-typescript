import { Pool, QueryResult } from 'pg';
import pool from '../config/database';
import { AddressType, UserType, UserAddressType } from '../types/index';
import { createAddressHash, createUserHash } from '../utils/hash';

export class DatabaseService {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }
    
    async createUserAddressLink(user_key: string, address_key: string): Promise<UserAddressType> {
        const query = `
            INSERT INTO user_address_link_tbl (user_key, address_key)
            VALUES ($1, $2) ON CONFLICT (user_key, address_key) DO NOTHING;
        `;
      const result   = await this.pool.query(query, [user_key, address_key]);
      return result.rows[0];
    }

    async createAddress(addressData: AddressType): Promise<AddressType> {
        const address_key = createAddressHash(addressData);
        
        // First check if address_tbl already exists
        const existingAddress = await this.getAddressById(address_key);
        if (existingAddress) {
            return existingAddress;
        }

        const query = `
            INSERT INTO address_tbl (address_key, country_id, city, state, zip_code)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (address_key) DO NOTHING 
            RETURNING *;
        `;
        const values = [address_key, addressData.country_id, addressData.city, addressData.state, addressData.zip_code];
        const result: QueryResult = await this.pool.query(query, values);
        return result.rows[0];
    }

    async createUser(userData: UserType): Promise<UserType> {
        const user_key = createUserHash(userData.email);

        const existingUser = await this.getUserByEmail(userData.email);
        if (existingUser) {
            return existingUser;
        }


        const query = `
            INSERT INTO user_tbl (user_key, first_name, last_name, email)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_key) DO NOTHING
            RETURNING *
        `;
        const values = [user_key, userData.first_name, userData.last_name, userData.email];
        const result: QueryResult = await this.pool.query(query, values);
        
        if (!result.rows[0]) {
            throw new Error('Email already exists');
        }
        
        return result.rows[0];
    }

    async getUserByEmail(email: string): Promise<UserType | null> {
        const query = `
            SELECT * FROM user_tbl
            WHERE email = $1
        `;
        const result: QueryResult = await this.pool.query(query, [email]);
        return result.rows[0] || null;
    }

    async getAddressById(addressKey: string): Promise<AddressType | null> {
        const query = `
            SELECT * FROM address_tbl
            WHERE address_key = $1
        `;
        const result: QueryResult = await this.pool.query(query, [addressKey]);
        return result.rows[0] || null;
    }

    async getUserByKey(userKey: string): Promise<UserType | null> {
        const query = `
            SELECT * FROM user_tbl join address_tbl on user_tbl.use_key = address_tbl.user_key
            WHERE user_key = $1
        `;
        const result: QueryResult = await this.pool.query(query, [userKey]);
        return result.rows[0] || null;
    }
    async getUserAddress(email : string): Promise<UserAddressType | null> {
        const query = `
            SELECT * FROM user_tbl join user_address_link_tbl on user_tbl.user_key = user_address_link_tbl.user_key 
            join address_tbl on user_address_link_tbl.address_key = address_tbl.address_key
            WHERE user_tbl.email = $1
        `;
        const result: QueryResult = await this.pool.query(query, [email]);
        return result.rows[0] || null;
    }
    async deleteUserAddressByEmail(email: string): Promise<{ message: string }> {
        // Get user key first
        const getUserKeyQuery = `
            SELECT user_key 
            FROM public.user_tbl 
            WHERE email = $1
        `;
        const userResult = await this.pool.query(getUserKeyQuery, [email]);
        const userKey = userResult.rows[0]?.user_key;

        if (!userKey) {
            return { message: 'User not found' };
        }

        // Delete from user_address_link_tbl first
        const deleteLinksQuery = `
            DELETE FROM public.user_address_link_tbl
            WHERE user_key = $1
        `;
        await this.pool.query(deleteLinksQuery, [userKey]);

        // Delete orphaned addresses
        const deleteOrphanedAddressesQuery = `
            DELETE FROM public.address_tbl
            WHERE address_key NOT IN (
                SELECT address_key 
                FROM public.user_address_link_tbl
            )
        `;
        await this.pool.query(deleteOrphanedAddressesQuery);

        // Finally delete the user
        const deleteUserQuery = `
            DELETE FROM public.user_tbl 
            WHERE user_key = $1
        `;
        await this.pool.query(deleteUserQuery, [userKey]);
        return { message: 'User and associated address data deleted successfully' };
    }
    async updateUser(email: string,  first_name: string, last_name: string): Promise<any> {
        if (!email || !first_name || !last_name) {
            throw new Error('Missing required fields');
        }

        const checkUserQuery = `
            SELECT * FROM public.user_tbl 
            WHERE email = $1
        `;
        const userExists = await this.pool.query(checkUserQuery, [email]);
        if (userExists.rows.length === 0) {
            throw new Error('User not found');
        }
         const query = `
             UPDATE public.user_tbl SET first_name = $2, last_name = $3
             WHERE email = $1
         `;
         const result: QueryResult = await this.pool.query(query, [ email, first_name, last_name]);
         return {email, first_name, last_name};
    }

}   

export default new DatabaseService();
