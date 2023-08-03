import React, { useState, useRef, useEffect } from 'react';
import styles from './App.module.scss';

// In real words project I'd do the following:
// - extract Input and FormGoup components to make the code more reusable;
// - add a debounce to the input to avoid unnecessary requests;
// - add a nicer loader;
// - make use of arrow keys to navigate through the options, instead of tab;
// - use graphql-codegen to generate types from graphQL API;
// - add a model to transform data according to front-end needs;
// - separate fetch logic from the component, into a service;
// - make a reusable custom hook to handle the fetch logic, with more sophisticated error handling;
// - add a test suite;

// With such API where we can fetch only all the data at once, I'd rather fetch the list once, and then filter it locally.
// Probably, I should have made use of an API where I can filter the data on the server side in this task...

const INPUT_ID = 'auto_complete_input';
// I've gone for a graphql API because I wanted to extract only necessary info about the characters.
const API_URL = 'https://rickandmortyapi.com/graphql';
const query = `{
  characters {
    results {
      name
      id
    }
  }
}`;

enum FetchStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

type TListItem = {
  name: string;
  id: string;
};

const fetchData = async (): Promise<TListItem[]> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    const { results } = data.data.characters;

    return results;
  }

  throw new Error(response.statusText);
};

const App = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [list, setList] = useState<TListItem[]>([]);
  const [status, setStatus] = useState(FetchStatus.IDLE);
  const [inputValue, setInputValue] = useState('');
  const [hasClearButton, setHasClearButton] = useState(false);

  const resetList = () => {
    setList([]);
    setStatus(FetchStatus.IDLE);
  };

  const handleInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value.trimStart();

    setInputValue(value);

    if (!value) {
      return;
    }

    const searchQuery = value.toLowerCase();

    if (status !== FetchStatus.ERROR && status !== FetchStatus.LOADING) {
      setStatus(FetchStatus.LOADING);
    }

    try {
      const data = await fetchData();
      const filteredData = data.reduce<TListItem[]>((accum, { id, name }) => {
        const highlightIndex = searchQuery
          ? name.toLowerCase().indexOf(searchQuery)
          : -1;

        if (highlightIndex === -1) {
          return accum;
        }

        return [
          ...accum,
          {
            id,
            name: `${name.slice(0, highlightIndex)}<strong>${name.slice(
              highlightIndex,
              highlightIndex + searchQuery.length
            )}</strong>${name.slice(highlightIndex + searchQuery.length)}`,
          },
        ];
      }, []);

      setList(filteredData);
      setStatus(FetchStatus.SUCCESS);
    } catch (error) {
      setStatus(FetchStatus.ERROR);
    }
  };

  const handleOptionSelection = (
    event: React.MouseEvent<HTMLLIElement> | React.KeyboardEvent<HTMLLIElement>
  ) => {
    setHasClearButton(true);
    setInputValue((event.target as HTMLLIElement).innerText);
    resetList();
    inputRef.current?.focus();
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLLIElement>) => {
    if (event.key === 'Enter') {
      handleOptionSelection(event);
    }
  };

  const handleReset = () => {
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleResetKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter') {
      handleReset();
    }
  };

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        return;
      case 'Escape':
        event.preventDefault();
        handleReset();
        return;
      default:
        return;
    }
  };

  useEffect(() => {
    if (!inputValue) {
      resetList();
      setHasClearButton(false);
    }
  }, [inputValue]);

  return (
    <form className={styles.form} onKeyDown={handleFormKeyDown}>
      <div className={styles.formgroup}>
        <label
          htmlFor={INPUT_ID}
          className={styles.label}>
          Rick and Morty Characters
        </label>
        <div className={styles['input-wrapper']}>
          <input
            ref={inputRef}
            id={INPUT_ID}
            type='search'
            autoComplete='off'
            placeholder='Search for a character'
            className={styles.input}
            value={inputValue}
            onChange={handleInputChange}
          />
          {status !== FetchStatus.IDLE && status !== FetchStatus.ERROR && (
            <ul className={styles.list}>
              {status === FetchStatus.LOADING && (
                <li className={`${styles.option} ${styles['non-selectable']}`}>
                  Loading...
                </li>
              )}
              {status === FetchStatus.SUCCESS &&
                (list.length ? (
                  list.map(({ name, id }) => (
                    <li
                      key={id}
                      className={styles.option}
                      dangerouslySetInnerHTML={{ __html: name }}
                      onClick={handleOptionSelection}
                      onKeyDown={handleOptionKeyDown}
                      tabIndex={0}
                    />
                  ))
                ) : (
                  <li className={`${styles.option} ${styles['non-selectable']}`}>
                    No options
                  </li>
                ))}
            </ul>
          )}
          {status === FetchStatus.ERROR && (
            <p className={styles.error}>
              We`re experiencing technical issues at the moment.
              <br />
              Please try again or contact support.
            </p>
          )}
          {hasClearButton && (
            <button
              type='reset'
              className={styles.clear}
              onClick={handleReset}
              onKeyDown={handleResetKeyDown}>
              Clear
            </button>
          )}
        </div>
      </div>
    </form>
  );
};

export default App;
