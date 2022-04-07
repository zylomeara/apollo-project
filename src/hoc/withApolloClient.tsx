import { ComponentClass, FC, useMemo } from "react";
import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache } from '@apollo/client';
import React from "react";
const signer = require('../vendor/signer-sdk/signer');

export interface IInjectedProps {
  appKey: string | null;
  appSecret: string | null;
}

const GRAPHQL_URL = 'graphql'

export const withApolloClient = <P,>(WrappedComponent: FC<P> | ComponentClass<P>) => (props: P & IInjectedProps) => {
  const {appKey, appSecret} = props;

  const client = useMemo(() => {
    return !!appKey && !!appSecret ? (
      new ApolloClient({
        cache: new InMemoryCache(),
        link: new HttpLink({
          uri: GRAPHQL_URL,
          fetch: (uri: any, options: any) => {
            let sig = new signer.Signer()
            sig.Key = appKey
            sig.Secret = appSecret
            let request = new signer.HttpRequest(options.method, process.env.URL_PROJECT, options.headers, options.body)
            sig.Sign(request)

            return fetch(uri, options);
          },
        })
      })
    ) : null
  }, [appKey, appSecret]);

  if (!client) return (
    <div className="AuthError">
      Для загрузки данных необходима аутентификация
    </div>
  );

  return (
    <ApolloProvider client={client}>
      <WrappedComponent {...props} />
    </ApolloProvider>
  )
}
