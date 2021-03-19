import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    let storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAmount = cart.reduce((amount, product) => {
        if (product.id === productId) {
          amount += product.amount;
        }
        return amount;
      }, 1)

      const stock = (await api.get(`stock/${productId}`)).data;

      if (stock.amount < productAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      const product = (await api.get(`/products/${productId}`)).data

      if (productAmount === 1) {
        const newProduct = { ...product, amount: productAmount };
        setCart([...cart, newProduct]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, newProduct]));
        return;
      }

      const newCart = cart.map(product => {
        if (product.id === productId) {
          product.amount = productAmount;
          return product;
        }
        return product;
      })

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch (err) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      let productExist = false

      let newCart = cart.filter(product => {
        if (product.id === productId) {
          productExist = true
        }
        return product.id !== productId
      })

      if (productExist === false) {
        toast.error('Erro na remoção do produto')
      } else {
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
        setCart(newCart)
      }

    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const stockAmount = (await api.get(`stock/${productId}`)).data.amount;

      if (stockAmount < amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      const newCart = cart.map(product => {
        if (product.id === productId) product.amount = amount;
        return product;
      })

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
