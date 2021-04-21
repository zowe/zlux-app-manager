import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Select from 'react-select';

const styles = require('./PluginCard.css');

const customDropdownStyles = {
  control: (provided, _state) => ({
    ...provided,
    background: '#FFF7D6',
    fontWeight: 'bold',
    '&:hover': {
      fontWeight: 'bold',
    },
  }),
};

const PluginCard = ({ plugin, files, options, text, icon }: any) => {
  const history = useHistory();

  const [selectedOption, setSelectedOption] = useState(options && options[0]);
  const [selectedFiles, setSelectedFiles] = useState(
    options && files[options[0]?.value]
  );

  useEffect(() => {
    if (selectedOption !== options[0]) {
      setSelectedOption(options[0]);
    }
  }, [options]);

  useEffect(() => {
    setSelectedFiles(files[options[0]?.value]);
  }, [text]);

  const handleOptionChange = (newOption) => {
    setSelectedOption(newOption);
    setSelectedFiles(files[newOption.value]);
  };

  return (
    <div className={styles.cardWrapper}>
      <div className={styles.mainContent}>
        <div className={styles.metaInfo}>
          <img src={icon} alt='plugin-icon' />
          <div className={styles.pluginName}>{plugin}</div>
        </div>
        <div className={styles.contentWrapper}>
          <div className={styles.dropdownWrapper}>
            <Select
              styles={customDropdownStyles}
              value={selectedOption}
              onChange={handleOptionChange}
              options={options}
              isClearable={false}
              isSearchable
              defaultValue={options[0]}
            />
          </div>
          <div className={styles.filesWrapper}>
            {selectedFiles?.map((file) => {
              const { fileName, code, language } = file;
              return (
                <div
                  className={styles.button}
                  onClick={() => {
                    history.push({
                      pathname: '/code',
                      state: { code, language },
                    });
                  }}>
                  {fileName}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginCard;
