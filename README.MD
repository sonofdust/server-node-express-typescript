# Setting up Express TypeScript Server with pnpm

1. Create a new project directory and initialize:

```bash
mkdir express-typescript-server
cd express-typescript-server
pnpm init
```

2. Install dependencies:

```bash
pnpm add express
pnpm add -D typescript @types/node @types/express ts-node nodemon
```

3. Create TypeScript configuration file (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

4. Create `nodemon.json` for auto-reloading:

```json
{
  "watch": ["src"],
  "ext": ".ts,.js",
  "ignore": [],
  "exec": "ts-node ./src/index.ts"
}
```

5. Update `package.json` scripts:

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "dev": "nodemon",
    "build": "tsc"
  }
}
```

6. Create the server file (`src/index.ts`):

```typescript
import express, { Express, Request, Response } from 'express';

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server is running');
});

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
```

7. Create source directory and start coding:

```bash
mkdir src
```

8. Run the development server:

```bash
pnpm dev
```

9. For production build:

```bash
pnpm build
pnpm start
```

Project structure should look like this:

```
express-typescript-server/
├── node_modules/
├── src/
│   └── index.ts
├── package.json
├── nodemon.json
├── tsconfig.json
└── pnpm-lock.yaml
```

# Setting up PostgreSQL with Hashed Keys

1. Install dependencies:

```bash
pnpm add pg crypto
pnpm add -D @types/pg @types/node
```

2. Create a utility file for hashing (`src/utils/hash.ts`):

```typescript
import crypto from 'crypto';

export const createHash = (data: string): string => {
    return crypto
        .createHash('sha256')
        .update(data)
        .digest('hex');
};

export const createAddressHash = (address_tbl: {
    country_id: string;
    city: string;
    state: string;
    zip_code: string;
}): string => {
    const addressString = `${address_tbl.country_id.toLowerCase()}-${address_tbl.city.toLowerCase()}-${address_tbl.state.toLowerCase()}-${address_tbl.zip_code}`;
    return createHash(addressString);
};

export const createUserHash = (email: string): string => {
    return createHash(email.toLowerCase());
};
```

3. Create the database tables (`src/db/init.sql`):

```sql
ftREATE TABLE IF NOT EXISTS public.address_tbl
(
    address_key character(64) COLLATE pg_catalog."default" NOT NULL,
    country_id character varying(3) COLLATE pg_catalog."default" NOT NULL,
    city character varying(100) COLLATE pg_catalog."default" NOT NULL,
    state character varying(100) COLLATE pg_catalog."default" NOT NULL,
    zip_code character varying(20) COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT address_pkey PRIMARY KEY (address_key)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.address_tbl
    OWNER to postgres;




CREATE TABLE IF NOT EXISTS public.user_address_link_tbl
(
    user_key "char" NOT NULL,
    address_key "char" NOT NULL,
    CONSTRAINT user_address_link_tbl_pkey PRIMARY KEY (user_key, address_key)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.user_address_link_tbl
    OWNER to postgres;


CREATE TABLE IF NOT EXISTS public.user_tbl
(
    user_key character(64) COLLATE pg_catalog."default" NOT NULL,
    first_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    last_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    address_key character(64) COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_credentials_pkey PRIMARY KEY (user_key),
    CONSTRAINT unique_email UNIQUE (email),
    CONSTRAINT fk_address FOREIGN KEY (address_key)
        REFERENCES public.address_tbl (address_key) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)

TABLESPACE pg_default;


```

4. Create TypeScript interfaces (`src/types/index.ts`):

```typescript
export interface address_tbl {
    address_key: string;
    country_id: string;
    city: string;
    state: string;
    zip_code: string;
}

export interface UserCredentials {
    user_key: string;
    first_name: string;
    last_name: string;
    email: string;
    address_key: string;
}
```

5. Create database services (`src/services/db.service.ts`):

```typescript
import { Pool, QueryResult } from 'pg';
import pool from '../config/database';
import { address_tbl, UserCredentials } from '../types';
import { createAddressHash, createUserHash } from '../utils/hash';

export class DatabaseService {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    async createAddress(addressData: Omit<address_tbl, 'address_key'>): Promise<address_tbl> {
        const address_key = createAddressHash(addressData);
    
        // First check if address_tbl already exists
        const existingAddress = await this.getAddressById(address_key);
        if (existingAddress) {
            return existingAddress;
        }

        const query = `
            INSERT INTO address_tbl (address_key, country_id, city, state, zip_code)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [address_key, addressData.country_id, addressData.city, addressData.state, addressData.zip_code];
        const result: QueryResult<address_tbl> = await this.pool.query(query, values);
        return result.rows[0];
    }

    async createUser(userData: Omit<UserCredentials, 'user_key'>): Promise<UserCredentials> {
        const user_key = createUserHash(userData.email);

        // Check if user already exists
        const existingUser = await this.getUserByEmail(userData.email);
        if (existingUser) {
            throw new Error('Email already exists');
        }

        const query = `
            INSERT INTO user_tbl (user_key, first_name, last_name, email, address_key)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [user_key, userData.first_name, userData.last_name, userData.email, userData.address_key];
        const result: QueryResult<UserCredentials> = await this.pool.query(query, values);
        return result.rows[0];
    }

    async getUserByEmail(email: string): Promise<UserCredentials | null> {
        const query = `
            SELECT * FROM user_tbl
            WHERE email = $1
        `;
        const result: QueryResult<UserCredentials> = await this.pool.query(query, [email]);
        return result.rows[0] || null;
    }

    async getAddressById(addressKey: string): Promise<address_tbl | null> {
        const query = `
            SELECT * FROM address_tbl
            WHERE address_key = $1
        `;
        const result: QueryResult<address_tbl> = await this.pool.query(query, [addressKey]);
        return result.rows[0] || null;
    }

    async getUserByKey(userKey: string): Promise<UserCredentials | null> {
        const query = `
            SELECT * FROM user_tbl
            WHERE user_key = $1
        `;
        const result: QueryResult<UserCredentials> = await this.pool.query(query, [userKey]);
        return result.rows[0] || null;
    }
}

export default new DatabaseService();
```

6. Create example route (`src/routes/user.routes.ts`):

```typescript
import express, { Request, Response } from 'express';
import dbService from '../services/db.service';
import { createAddressHash } from '../utils/hash';

const router = express.Router();

router.post('/user', async (req: Request, res: Response) => {
    try {
        const { first_name, last_name, email, country_id, city, state, zip_code } = req.body;

        // Create address_tbl and get address_key
        const address_tbl = await dbService.createAddress({
            country_id,
            city,
            state,
            zip_code
        });

        // Create user with address_key
        const user = await dbService.createUser({
            first_name,
            last_name,
            email,
            address_key: address_tbl.address_key
        });

        res.status(201).json({ user, address_tbl });
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.message === 'Email already exists') {
            res.status(409).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: 'Error creating user' });
        }
    }
});

router.get('/address_tbl/:address_tbl', async (req: Request, res: Response) => {
    try {
        const { country_id, city, state, zip_code } = req.query;
        const addressKey = createAddressHash({
            country_id: String(country_id),
            city: String(city),
            state: String(state),
            zip_code: String(zip_code)
        });
        const address_tbl = await dbService.getAddressById(addressKey);
        res.json(address_tbl);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching address_tbl' });
    }
});

export default router;
```

Key changes from the previous version:

1. Uses SHA-256 hashing for address_key and user_key
2. address_key is generated from concatenated, lowercase address_tbl fields
3. user_key is generated from lowercase email
4. Added duplicate checking for addresses
5. Changed column types to CHAR(64) to match SHA-256 hash length
6. Added utility functions for consistent hash generation
7. Added example endpoint to look up address_tbl by components

Example usage:

```bash
# Create new user with address_tbl
curl -X POST http://localhost:3000/api/user \
-H "Content-Type: application/json" \
-d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "country_id": "USA",
    "city": "New York",
    "state": "NY",
    "zip_code": "10001"
}'

# Look up address_tbl
curl "http://localhost:3000/api/address_tbl?country_id=USA&city=New%20York&state=NY&zip_code=10001"
```
