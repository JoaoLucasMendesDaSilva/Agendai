import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  buscarSessao,
  cadastrarUsuario,
  clearToken,
  getToken,
  loginUsuario,
  setToken,
} from '../services/api';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function validarSessao() {
      if (!getToken()) {
        setCarregandoSessao(false);
        return;
      }

      try {
        const resposta = await buscarSessao();

        if (ativo) {
          setUsuario(resposta.usuario);
        }
      } catch {
        clearToken();

        if (ativo) {
          setUsuario(null);
        }
      } finally {
        if (ativo) {
          setCarregandoSessao(false);
        }
      }
    }

    validarSessao();

    return () => {
      ativo = false;
    };
  }, []);

  async function cadastrar(dados) {
    return cadastrarUsuario(dados);
  }

  async function login(dados, opcoes = {}) {
    const resposta = await loginUsuario(dados);
    setToken(resposta.token, Boolean(opcoes.lembrar));
    setUsuario(resposta.usuario);
    return resposta;
  }

  function logout() {
    clearToken();
    setUsuario(null);
  }

  const value = useMemo(
    () => ({
      carregandoSessao,
      cadastrar,
      login,
      logout,
      usuario,
    }),
    [carregandoSessao, usuario]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}

export { AuthProvider, useAuth };
