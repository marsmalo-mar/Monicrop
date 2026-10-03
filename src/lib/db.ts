import mysql, {
  type ResultSetHeader,
  type PoolConnection,
  type RowDataPacket,
} from "mysql2/promise";
const globals = globalThis as typeof globalThis & { monicropPool?: mysql.Pool };
export const pool =
  globals.monicropPool ??
  mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "monicrop",
    connectionLimit: 8,
    dateStrings: true,
    charset: "utf8mb4",
    timezone: "+08:00",
    connectTimeout: 5000,
  });
globals.monicropPool = pool;
type Value = string | number | null;
export async function query<T>(
  sql: string,
  values: Value[] = [],
  connection?: PoolConnection,
): Promise<T[]> {
  const [rows] = await (connection ?? pool).execute<RowDataPacket[]>(
    sql,
    values,
  );
  return rows as T[];
}
export async function execute(
  sql: string,
  values: Value[] = [],
  connection?: PoolConnection,
) {
  const [result] = await (connection ?? pool).execute<ResultSetHeader>(
    sql,
    values,
  );
  return result;
}
export async function transaction<T>(
  action: (connection: PoolConnection) => Promise<T>,
) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await action(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
export const userColumns =
  "user_ID,user_name,email,user_type,fname,minitial,lname,prof_name,birthdate,phone,street,barangay,city,province,country,postal_code,profile_pic";
