export interface Store {
  slug: string;
  name: string;
  slogan: string | null;
  company: string | null;
  address: string | null;
  email: string | null;
  phones: string[];
  whatsapp: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  currency: string;
  products_count: number;
}

export interface Category {
  id: number;
  name: string;
  products_count: number;
}

export interface ProductUnit {
  id: number;
  name: string;
  price: number;
  is_base: boolean;
}

export type Availability = 'in_stock' | 'low';

export interface Product {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  category: { id: number; name: string } | null;
  unit: string;
  price: number | null;
  availability: Availability;
  units: ProductUnit[];
}

export interface Page<T> {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

export type ProductSort = 'name' | 'price_asc' | 'price_desc' | 'recent';

export interface ProductQuery {
  page: number;
  search: string;
  categoryId: number | null;
  sort: ProductSort;
}
